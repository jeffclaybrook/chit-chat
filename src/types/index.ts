export type ConversationType = "DIRECT" | "GROUP"

export type UserLite = {
 id: string
 clerkUserId?: string | null
 firstName: string | null
 lastName: string | null
 imageUrl: string | null
}

export type LastMessageType = {
 id: string
 body: string | null
 type: "TEXT" | "IMAGE" | "SYSTEM"
 hasImage: boolean
 createdAt: string
 authorId: string
}

export type ConversationListItemType = {
 id: string
 type: ConversationType
 title: string | null
 avatarUrl: string | null
 lastMessageAt: string | null
 lastMessage: LastMessageType | null
 participants: UserLite[]
 unread: number
}

export type ConversationListItemExtendedType = {
 id: string
 type: ConversationType
 title: string | null
 avatarUrl: string | null
 lastMessageAt: string | null
 lastMessage: LastMessageType | null
 participants: UserLite[]
 unread: number
 isUnread: boolean
}

export type ConversationDetailType = {
 id: string
 type: ConversationType
 title: string | null
 avatarUrl: string | null
 participants: {
  user: UserLite
 }[]
}

export type AttachmentType = {
 id: string
 secureUrl: string
 width?: number | null
 height?: number | null
 format?: string | null
}

export type MessageType = {
 id: string
 conversationId: string
 authorId: string
 type: "TEXT" | "IMAGE" | "SYSTEM"
 body: string | null
 hasImage: boolean
 createdAt: string
 author: UserLite
 attachments: AttachmentType[]
}