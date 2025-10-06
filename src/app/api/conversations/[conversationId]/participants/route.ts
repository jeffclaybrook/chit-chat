import { NextResponse, type NextRequest } from "next/server"
import { requireDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { modifyParticipantsSchema } from "@/lib/validators"

export const runtime = "nodejs"

type Ctx<T> = {
 params: Promise<T>
}

export async function POST(
 req: NextRequest,
 ctx: Ctx<{ conversationId: string }>
) {
 const { conversationId } = await ctx.params
 const { dbUserId } = await requireDbUser()

 const conversation = await prisma.conversation.findUnique({
  where: {
   id: conversationId
  },
  select: {
   id: true,
   type: true
  }
 })

 if (!conversation || conversation.type !== "GROUP") {
  return NextResponse.json({ error: "Group not found" }, { status: 404 })
 }

 const me = await prisma.participant.findUnique({
  where: {
   conversationId_userId: {
    conversationId: conversation.id,
    userId: dbUserId
   }
  }
 })

 if (!me) {
  return NextResponse.json({ error: "Forbidden" },{ status: 403 })
 }

 const payload = await req.json()
 const parsed = modifyParticipantsSchema.safeParse(payload)

 if (!parsed.success) {
  return NextResponse.json(parsed.error.format(), { status: 400 })
 }

 const { add, remove } = parsed.data

 if (add.length) {
  await prisma.participant.createMany({
   data: add.map((id) => ({ conversationId: conversation.id, userId: id })),
   skipDuplicates: true
  })
 }

 if (remove.length) {
  await prisma.participant.deleteMany({
   where: {
    conversationId: conversation.id,
    userId: {
     in: remove
    }
   }
  })
 }

 await prisma.conversation.update({
  where: {
   id: conversation.id
  },
  data: {
   updatedAt: new Date()
  }
 })

 await prisma.$transaction(async (tx) => {
  await tx.conversation.update({
   where: {
    id: conversation.id
   },
   data: {}
  })
 })

 await Promise.all([
  (async () =>
   await import("@/lib/pusher/server").then(({ pusherServer, channelForConversation, EVT }) =>
    pusherServer.trigger(channelForConversation(conversation.id), EVT.CONVERSATION_UPDATED, { conversationId: conversation.id })
   )
  )()
 ])

 return NextResponse.json({ ok: true })
}