"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { SignOutButton, useAuth, useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { EVT, pusherClient } from "@/lib/pusher/client"
import { channelForUser } from "@/lib/pusher/server"
import { cn } from "@/lib/utils"
import { ConversationListItemExtendedType } from "@/types"
import { fetcher } from "@/utils/fetcher"
import { formatDate } from "@/utils/format-date"
import { getInitials } from "@/utils/get-initials"
import { getOtherParticipant } from "@/utils/get-other-participant"
import { lastMessagePreview } from "@/utils/last-message-preview"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "./ui/sidebar"
import { ArchivedConversations } from "./ArchivedConversations"
import { ArchiveIcon, ChevronsUpDownIcon, DeleteIcon, ImageIcon, MailIcon, MonitorIcon, MoonIcon, MoreIcon, MuteIcon, SunIcon } from "./Icons"
import { StartChatDialog } from "./StartChatDialog"
import useSWR, { useSWRConfig} from "swr"

const themes = [
 { label: "Light", value: "light", Icon: SunIcon },
 { label: "Dark", value: "dark", Icon: MoonIcon },
 { label: "System", value: "system", Icon: MonitorIcon }
]

type ConversationsSidebarProps = {
 selectedId?: string
 onArchive?: (id: string) => Promise<void>
 onDelete?: (id: string) => Promise<void>
 onMute?: (id: string) => Promise<void>
 onMarkUnread?: (id: string) => Promise<void>
}

export function ConversationsSidebar({
 selectedId,
 onArchive,
 onDelete,
 onMute,
 onMarkUnread
}: ConversationsSidebarProps) {
 const [open, onOpenChange] = useState<boolean>(false)
 const [mounted, setMounted] = useState<boolean>(false)
 const { setTheme, theme } = useTheme()
 const { user, isLoaded } = useUser()
 const { userId } = useAuth()
 const { isMobile } = useSidebar()
 const { mutate } = useSWRConfig()
 const { data, isLoading } = useSWR<ConversationListItemExtendedType[]>("/api/conversations", fetcher, {
  revalidateOnFocus: true
 })

 const firstName = user?.firstName ?? null
 const lastName = user?.lastName ?? null
 const imageUrl = user?.imageUrl ?? null
 const email =
  user?.primaryEmailAddress?.emailAddress ??
  user?.emailAddresses?.[0]?.emailAddress ??
  ""

 const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Your account"

 const router = useRouter()

 useEffect(() => {
  setMounted(true)
 }, [])

 useEffect(() => {
  if (!userId) {
   return
  }

  const ch = pusherClient.subscribe(channelForUser(userId))
  const onNew = () => mutate("/api/conversations")
  const onUpdate = () => mutate("/api/conversations")

  ch.bind(EVT.MESSAGE_NEW, onNew)
  ch.bind(EVT.CONVERSATION_UPDATED, onUpdate)

  return () => {
   ch.unbind(EVT.MESSAGE_NEW, onNew)
   ch.unbind(EVT.CONVERSATION_UPDATED, onUpdate)
   pusherClient.unsubscribe(channelForUser(userId))
  }
 }, [userId, mutate])

 const archiveConversation = async (id: string) => {
  mutate<ConversationListItemExtendedType[]>("/api/conversations",
   (curr) => (curr ?? []).filter(c => c.id !== id),
   false
  )

  const res = await fetch(`/api/conversations/${id}/archive`, { method: "POST" })

  if (!res.ok) {
   mutate("/api/conversations")
  }

  toast.success("Conversation archived!")
 }

 const deleteConversation = async (id: string) => {
  mutate<ConversationListItemExtendedType[]>("/api/conversations",
   (curr) => (curr ?? []).filter(c => c.id !== id),
   false
  )

  const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" })

  if (!res.ok) {
   mutate("/api/conversations")
  }

  toast.success("Conversation deleted!")
 }

 const markConversationUnread = async (id: string) => {
  mutate<ConversationListItemExtendedType[]>("/api/conversations",
   (curr) => (curr ?? []).map(c => c.id === id ? { ...c, isUnread: true } : c),
   false
  )

  const res = await fetch(`/api/conversations/${id}/mark-unread`, { method: "POST" })

  if (!res.ok) {
   mutate("/api/conversations")
  }

  toast.success("Conversation marked unread!")
 }

 const muteConversation = async () => {
  console.warn("TODO: implement mute endpoint")
  toast.success("muteConversation() triggered")
 }

 const openConversation = (id: string) => {
  mutate<ConversationListItemExtendedType[]>("/api/conversations",
   (curr) => (curr ?? []).map(c => c.id === id ? { ...c, isUnread: false } : c),
   false
  )

  router.push(`/conversations/${id}`)
 }

 const items = data ?? []

 if (!mounted) {
  return null
 }

 if (!isLoaded) {
  return (
   <div className="flex items-center gap-2 p-2">
    <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
    <div className="space-y-1">
     <div className="h-3 w-24 bg-muted rounded animate-pulse" />
     <div className="h-3 w-36 bg-muted rounded animate-pulse" />
    </div>
   </div>
  )
 }

 return (
  <>
   <Sidebar collapsible="offcanvas">
    <SidebarHeader>
     <StartChatDialog />
    </SidebarHeader>
    <SidebarContent>
     <SidebarGroup>
      <SidebarGroupLabel>Conversations</SidebarGroupLabel>
      <SidebarGroupContent>
       <SidebarMenu>
        {isLoading ? (
         <SidebarMenuItem>
          <SidebarMenuButton disabled className="justify-start">Loading...</SidebarMenuButton>
         </SidebarMenuItem>
        ) : items.length === 0 ? (
         <SidebarMenuItem>
          <SidebarMenuButton disabled className="justify-start">No conversations yet</SidebarMenuButton>
         </SidebarMenuItem>
        ) : (
         items.map((c) => {
          const isDirect = c.type === "DIRECT"
          const other = isDirect ? getOtherParticipant(c, userId) : undefined
          const title = isDirect
           ? `${other?.firstName ?? ""} ${other?.lastName ?? ""}`.trim() || "Direct message"
           : c.title ?? "Group"
          const avatarUrl = isDirect ? other?.imageUrl : c.avatarUrl
          const stamp = c.lastMessage?.createdAt ?? c.lastMessageAt
          const preview = lastMessagePreview(c.lastMessage)

          return (
           <SidebarMenuItem key={c.id} className="group">
            <SidebarMenuButton
             onClick={() => openConversation(c.id)}
             className={cn(
              "justify-start gap-3 cursor-pointer h-12 group-has-data-[sidebar=menu-action]/menu-item:pr-2",
              selectedId === c.id && "bg-accent"
             )}
            >
             <Avatar className="h-8 w-8">
              {avatarUrl ? (
               <AvatarImage src={avatarUrl} alt={title} />
              ) : (
               <AvatarFallback>{isDirect ? getInitials(other?.firstName, other?.lastName) : "GC"}</AvatarFallback>
              )}
             </Avatar>
             <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
               <div className={cn("text-start truncate", c.isUnread ? "font-bold" : "font-medium")}>{title}</div>
               <div className="text-xs text-end text-muted-foreground shrink-0">{formatDate(stamp)}</div>
              </div>
              <div className="flex items-center justify-between gap-2">
               <div className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                {c.lastMessage?.hasImage && <ImageIcon className="h-3.5 w-3.5" />}
                <span className={cn("text-start truncate", c.isUnread ? "font-bold" : "font-medium")}>{preview}</span>
               </div>
               <div className="opacity-0 transition-opacity group-hover:opacity-100">
                <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                  <Button
                   type="button"
                   variant="ghost"
                   size="icon-sm"
                   aria-label="More"
                   className="hover:bg-transparent focus-visible:ring-0"
                  >
                   <MoreIcon className="size-5" />
                  </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => (onArchive ?? archiveConversation)(c.id)}>
                   <ArchiveIcon className="size-4" />
                   Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => (onMute ?? muteConversation)(c.id)}>
                   <MuteIcon className="size-4" />
                   Mute
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => (onMarkUnread ?? markConversationUnread)(c.id)} disabled={c.isUnread === true}>
                   <MailIcon className="size-4" />
                   Mark as Unread
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                     <Button
                      type="button"
                      variant="ghost"
                      aria-label="Delete conversation"
                      className="justify-start w-full rounded-sm px-2 py-1.5 text-sm px-2 has-[>svg]:px-2 rounded-sm"
                     >
                      <DeleteIcon className="size-4" />
                      Delete
                     </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                     <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure you want to delete this conversation?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone and will permanently delete this conversation.</AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => (onDelete ?? deleteConversation)(c.id)}>
                       <DeleteIcon className="size-4" />
                       Delete
                      </AlertDialogAction>
                     </AlertDialogFooter>
                    </AlertDialogContent>
                   </AlertDialog>
                  </DropdownMenuItem>
                 </DropdownMenuContent>
                </DropdownMenu>
               </div>
              </div>
             </div>
            </SidebarMenuButton>
           </SidebarMenuItem>
          )
         })
        )}
       </SidebarMenu>
      </SidebarGroupContent>
     </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
     <SidebarMenu>
      <SidebarMenuItem>
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
         <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
          <Avatar className="h-8 w-8">
           <AvatarImage src={imageUrl || "/avatar.png"} alt={fullName} />
           <AvatarFallback>{getInitials(firstName, lastName)}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-start text-sm leading-tight">
           <span className="font-medium truncate">{fullName}</span>
           <span className="text-xs truncate">{email}</span>
          </div>
          <ChevronsUpDownIcon className="size-4 ml-auto" />
         </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
         align="end"
         side={isMobile ? "bottom" : "right"}
         sideOffset={4}
         className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        >
         <DropdownMenuLabel className="font-normal p-0">
          <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
           <Avatar className="h-8 w-8">
            <AvatarImage src={imageUrl || "/avatar.png"} alt={fullName} />
            <AvatarFallback>{getInitials(firstName, lastName)}</AvatarFallback>
           </Avatar>
           <div className="grid flex-1 text-start text-sm leading-tight">
            <span className="font-medium truncate">{fullName}</span>
            <span className="text-xs truncate">{email}</span>
           </div>
          </div>
         </DropdownMenuLabel>
         <DropdownMenuSeparator />
         <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onOpenChange(true)}>Archived</DropdownMenuItem>
          <DropdownMenuSub>
           <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
           <DropdownMenuPortal>
            <DropdownMenuSubContent>
             {themes.map(({ label, value, Icon }) => (
              <DropdownMenuItem
               key={value}
               onClick={() => setTheme(value)}
               className={cn(
                "cursor-pointer",
                theme === value && "bg-accent text-accent-foreground"
               )}
              >
               <Icon className="size-4" />
               {label}
              </DropdownMenuItem>
             ))}
            </DropdownMenuSubContent>
           </DropdownMenuPortal>
          </DropdownMenuSub>
         </DropdownMenuGroup>
         <DropdownMenuSeparator />
         <DropdownMenuItem>
          <SignOutButton />
         </DropdownMenuItem>
        </DropdownMenuContent>
       </DropdownMenu>
      </SidebarMenuItem>
     </SidebarMenu>
    </SidebarFooter>
   </Sidebar>
   <ArchivedConversations open={open} onOpenChange={onOpenChange} />
  </>
 )
}