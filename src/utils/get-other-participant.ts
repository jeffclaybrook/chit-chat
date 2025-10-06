import { ConversationListItemType, UserLite } from "@/types"

export function getOtherParticipant(
 conversation: ConversationListItemType,
 myId?: string | null
): UserLite | undefined {
 if (conversation.type !== "DIRECT") {
  return undefined
 }

 return conversation.participants.find((user) => user.id !== myId)
}