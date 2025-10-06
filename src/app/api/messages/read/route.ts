import { NextResponse } from "next/server"
import { requireUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { markReadSchema } from "@/lib/validators"
import { channelForConversation, EVT, pusherServer } from "@/lib/pusher/server"

export async function POST(req: Request) {
 const userId = await requireUserId()
 const parsed = markReadSchema.safeParse(await req.json())

 if (!parsed.success) {
  return NextResponse.json(parsed.error.format(), { status: 400 })
 }

 const { conversationId, messageId } = parsed.data

 const membership = await prisma.participant.findUnique({
  where: {
   conversationId_userId: {
    conversationId,
    userId
   }
  }
 })

 if (!membership || membership.deletedAt) {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
 }

 await prisma.$transaction(async (tx) => {
  await tx.messageReadReceipt.upsert({
   where: {
    messageId_userId: {
     messageId,
     userId
    }
   },
   create: {
    messageId,
    userId
   },
   update: {
    seenAt: new Date()
   }
  })

  await tx.participant.update({
   where: {
    conversationId_userId: {
     conversationId,
     userId
    }
   },
   data: {
    lastSeenMessageId: messageId,
    lastSeenAt: new Date()
   }
  })
 })

 await pusherServer.trigger(channelForConversation(conversationId), EVT.MESSAGE_READ, {
  messageId,
  userId,
  seenAt: new Date().toISOString()
 })

 return NextResponse.json({ ok: true })
}