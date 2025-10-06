import Pusher from "pusher-js"

export const EVT = {
 CONVERSATION_UPDATED: "conversation:updated",
 MESSAGE_NEW: "message:new",
 MESSAGE_READ: "message:read"
}

export const pusherClient = new Pusher(
 process.env.NEXT_PUBLIC_PUSHER_KEY!,
 {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  forceTLS: true
 }
)

export const channelForConversation = (conversationId: string) => `conversation-${conversationId}`