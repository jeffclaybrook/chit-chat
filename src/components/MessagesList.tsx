/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useEffect, useRef } from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { ConversationType, MessageType, UserLite } from "@/types"
import { fetcher } from "@/utils/fetcher"
import { getInitials } from "@/utils/get-initials"
import { groupLabel } from "@/utils/group-label"
import { scrollToBottom } from "@/utils/scroll-to-bottom"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import Image from "next/image"
import useSWRInfinite from "swr/infinite"

type Page = {
 items: MessageType[]
 nextCursor: string | null
}

export function MessagesList({
 conversationId,
 conversationType,
 myId,
 participants
}: {
 conversationId: string
 conversationType: ConversationType
 myId: string
 participants: UserLite[]
}) {
 const getKey = (pageIndex: number, prev: Page | null) => {
  if (prev && prev.nextCursor === null) {
   return null
  }

  const cursor = pageIndex === 0 ? "" : `&cursor=${encodeURIComponent(prev!.nextCursor!)}`

  return `/api/messages?conversationId=${conversationId}&limit=30${cursor}`
 }

 const { data, mutate, setSize } = useSWRInfinite<Page>(getKey, fetcher, {
  revalidateFirstPage: true
 })

 const pages = data ?? []
 const itemsDesc = pages.flatMap((p) => p.items)
 const items = itemsDesc.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))

 useEffect(() => {
  const onNew = () => {
   setSize((s) => (s === 0 ? 1 : s))
   mutate()
   setTimeout(scrollToBottom, 50)
  }

  const onUpdated = () => {
   console.log("onUpdated()")
  }

  const listener = () => onNew()
  const updated = () => onUpdated()

  window.addEventListener("conversation:new-message", listener)
  window.addEventListener("conversation:updated", updated)

  return () => {
   window.removeEventListener("conversation:new-message", listener)
   window.removeEventListener("conversation:updated", updated)
  }
 }, [conversationId, mutate, setSize])

 const topRef = useRef<HTMLDivElement | null>(null)

 useEffect(() => {
  const el = topRef.current

  if (!el) {
   return
  }

  const io = new IntersectionObserver((entries) => {
   const first = entries[0]

   if (first.isIntersecting) {
    setSize((s) => s + 1)
   }
  }, { rootMargin: "200px 0px 0px 0px", threshold: 0 })

  io.observe(el)

  return () => io.disconnect()
 }, [setSize])

 useEffect(() => {
  const last = items[items.length - 1]

  if (!last || last.authorId === myId) {
   return
  }

  fetch("/api/messages/read", {
   method: "POST",
   headers: {
    "Content-Type": "application/json"
   },
   body: JSON.stringify({ conversationId, messageId: last.id })
  }).catch(() => {})
 }, [items, conversationId, myId])

 useEffect(() => {
  if (pages.length > 0 && items.length > 0) {
   scrollToBottom()
  }
 }, [items.length, pages.length])

 const groups: Array<{
  label: string
  messages: MessageType[]
 }> = []

 for (const msg of items) {
  const label = groupLabel(msg.createdAt)
  const lastGroup = groups[groups.length - 1]

  if (!lastGroup || lastGroup.label !== label) {
   groups.push({ label, messages: [msg] })
  } else {
   lastGroup.messages.push(msg)
  }
 }

 return (
  <div className="relative h-full">
   <div className="absolute inset-0 overflow-y-auto">
    <div ref={topRef} />
    <div className="px-3 py-4 space-y-6">
     {groups.map((g) => (
      <div key={g.label} className="space-y-2">
       <div className="flex justify-center sticky top-8 z-10">
        <span className="text-xs text-muted-foreground rounded-full bg-muted px-3 py-0.5">{g.label}</span>
       </div>
       <div className="space-y-3">
        {g.messages.map((m) => {
         const mine = m.authorId === myId
         const author = m.author

         return (
          <div key={m.id} className={cn("flex items-start", mine ? "justify-end" : "justify-start")}>
           {!mine && (
            <div className="hidden md:block mr-2">
             <Avatar className="h-8 w-8">
              {author.imageUrl ? (
               <AvatarImage src={author.imageUrl} alt="Author" />
              ) : (
               <AvatarFallback>{getInitials(author.firstName, author.lastName)}</AvatarFallback>
              )}
             </Avatar>
            </div>
           )}
           <div className={cn("max-w-[80%]", mine ? "text-end" : "text-start")}>
            {conversationType === "GROUP" && !mine && (
             <div className="text-xs text-muted-foreground mb-1">{`${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() || "Unknown"}</div>
            )}
            <div
             className={[
              "rounded-full px-3 py-1 whitespace-pre-wrap break-words",
              mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              m.attachments.length ? "p-1" : ""
             ].join(" ")}
            >
             {m.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
               {m.attachments.map((a) => (
                <Image
                 key={a.id}
                 src={a.secureUrl}
                 alt="Image"
                 width={250}
                 height={400}
                 className="rounded-xl max-h-64 md:max-h-80 object-cover"
                />
               ))}
              </div>
             )}
             {m.body && <div className={m.attachments.length ? "mt-1 px-2 pb-1" : ""}>{m.body}</div>}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">{format(new Date(m.createdAt), "p")}</div>
           </div>
          </div>
         )
        })}
       </div>
      </div>
     ))}
    </div>
    <div id="scroll-bottom-anchor" />
   </div>
  </div>
 )
}