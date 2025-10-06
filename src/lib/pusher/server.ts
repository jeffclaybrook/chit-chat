import Pusher from "pusher"

export const EVT = {
 CONVERSATION_CREATED: "conversation:created",
 CONVERSATION_UPDATED: "conversation:updated",
 CONVERSATION_DELETED: "conversation:deleted",
 MESSAGE_NEW: "message:new",
 MESSAGE_UPDATE: "message:update",
 MESSAGE_READ: "message:read",
 PARTICIPANT_ADDED: "participant:added",
 PARTICIPANT_REMOVED: "participant:removed"
}

export const pusherServer = new Pusher({
 appId: process.env.PUSHER_APP_ID!,
 key: process.env.PUSHER_KEY!,
 secret: process.env.PUSHER_SECRET!,
 cluster: process.env.PUSHER_CLUSTER!,
 useTLS: true
})

export const channelForConversation = (conversationId: string) => `conversation-${conversationId}`

export const channelForUser = (userId: string) => `user-${userId}`