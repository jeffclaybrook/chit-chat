import { ChatRoom } from "@/components/ChatRoom"

type Params = {
 params: {
  conversationId: string
 }
}

export default async function Conversation({ params }: Params) {
 return (
  <ChatRoom conversationId={params.conversationId} />
 )
}