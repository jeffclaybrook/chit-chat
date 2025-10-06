import { NextResponse, type NextRequest } from "next/server"
import { requireDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { channelForConversation, channelForUser, EVT, pusherServer } from "@/lib/pusher/server"

export const runtime = "nodejs"

type Ctx<T> = {
 params: Promise<T>
}

export async function POST(
 _req: NextRequest,
 ctx: Ctx<{ conversationId: string }>
) {
 const { conversationId } = await ctx.params
 const { dbUserId } = await requireDbUser()

 const participant = await prisma.participant.findUnique({
  where: {
   conversationId_userId: {
    conversationId,
    userId: dbUserId
   }
  },
  include: {
   conversation: {
    select: {
     id: true,
     participants: {
      select: {
       userId: true
      }
     }
    }
   }
  }
 })

 if (!participant) {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
 }

 await prisma.participant.update({
  where: {
   conversationId_userId: {
    conversationId,
    userId: dbUserId
   }
  },
  data: {
   deletedAt: new Date(),
   archivedAt: new Date()
  }
 })

 await pusherServer.trigger(channelForConversation(conversationId), EVT.PARTICIPANT_REMOVED, { dbUserId })
 await Promise.all(
  participant.conversation.participants.map((p) =>
   pusherServer.trigger(channelForUser(p.userId), EVT.CONVERSATION_UPDATED, { conversationId })
  )
 )

 return NextResponse.json({ ok: true })
}