"use client"

import { useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { channelForConversation, EVT, pusherClient } from "@/lib/pusher/client"
import { ConversationDetailType } from "@/types"
import { fetcher } from "@/utils/fetcher"
import { ChatHeader } from "./ChatHeader"
import { ChatInput } from "./ChatInput"
import { MessagesList } from "./MessagesList"
import useSWR from "swr"

export function ChatRoom({
 conversationId
}: {
 conversationId: string
}) {
 const { userId } = useAuth()

 const { data: conversation } = useSWR<ConversationDetailType>(
  `/api/conversations/${conversationId}`, fetcher,
  { revalidateOnFocus: true }
 )

 useEffect(() => {
  if (!conversationId) {
   return
  }

  const ch = pusherClient.subscribe(channelForConversation(conversationId))

  ch.bind(EVT.MESSAGE_NEW, () => {
   window.dispatchEvent(new CustomEvent("conversation:new-message", { detail: { conversationId }}))
  })

  ch.bind(EVT.CONVERSATION_UPDATED, () => {
   window.dispatchEvent(new CustomEvent("conversation:updated", { detail: { conversationId }}))
  })

  return () => {
   ch.unbind_all()
   pusherClient.unsubscribe(channelForConversation(conversationId))
  }
 }, [conversationId])

 const other =
  conversation?.type === "DIRECT"
   ? conversation?.participants.map((p) => p.user).find((u) => u.id !== userId)
   : undefined

 return (
  <div className="flex flex-col h-dvh">
   <ChatHeader
    type={conversation?.type ?? "DIRECT"}
    title={conversation?.type === "DIRECT"
     ? `${other?.firstName ?? ""} ${other?.lastName ?? ""}`.trim() || "Direct message"
     : conversation?.title ?? "Group"
    }
   />
   <div className="flex-1 min-h-0">
    <MessagesList
     conversationId={conversationId}
     conversationType={conversation?.type ?? "DIRECT"}
     myId={userId ?? ""}
     participants={(conversation?.participants ?? []).map((p) => p.user)}
    />
   </div>
   <ChatInput conversationId={conversationId} />
  </div>
 )
}