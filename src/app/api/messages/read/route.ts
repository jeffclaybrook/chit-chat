import { NextResponse } from "next/server"
import { requireDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { markReadSchema } from "@/lib/validators"
import { channelForConversation, EVT, pusherServer } from "@/lib/pusher/server"

export async function POST(req: Request) {
 const { dbUserId } = await requireDbUser()
 const parsed = markReadSchema.safeParse(await req.json())

 if (!parsed.success) {
  return NextResponse.json(parsed.error.format(), { status: 400 })
 }

 const { conversationId, messageId } = parsed.data

 const membership = await prisma.participant.findUnique({
  where: {
   conversationId_userId: {
    conversationId,
    userId: dbUserId
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
     userId: dbUserId
    }
   },
   create: {
    messageId,
    userId: dbUserId
   },
   update: {
    seenAt: new Date()
   }
  })

  await tx.participant.update({
   where: {
    conversationId_userId: {
     conversationId,
     userId: dbUserId
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
  dbUserId,
  seenAt: new Date().toISOString()
 })

 return NextResponse.json({ ok: true })
}