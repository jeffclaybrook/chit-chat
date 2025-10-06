import { NextResponse, type NextRequest } from "next/server"
import { requireUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { channelForUser, EVT, pusherServer } from "@/lib/pusher/server"

type Ctx<T> = {
 params: Promise<T>
}

async function ensureMember(
 conversationId: string,
 userId: string
) {
 const member = await prisma.participant.findUnique({
  where: {
   conversationId_userId: {
    conversationId,
    userId
   }
  },
  select: {
   id: true
  }
 })

 if (!member) {
  throw new Response("Not found", { status: 404 })
 }

 return member
}

export async function POST(
 _req: NextRequest,
 ctx: Ctx<{ conversationId: string }>
) {
 const { conversationId } = await ctx.params
 const userId = await requireUserId()

 await ensureMember(conversationId, userId)

 await prisma.participant.update({
  where: {
   conversationId_userId: {
    conversationId,
    userId
   }
  },
  data: {
   archivedAt: new Date()
  }
 })

 await pusherServer.trigger(channelForUser(userId), EVT.CONVERSATION_UPDATED, { conversationId })

 return NextResponse.json({ ok: true })
}

export async function DELETE(
 _req: NextRequest,
 ctx: Ctx<{ conversationId: string }>
) {
 const { conversationId } = await ctx.params
 const userId = await requireUserId()

 await ensureMember(conversationId, userId)

 await prisma.participant.update({
  where: {
   conversationId_userId: {
    conversationId,
    userId
   }
  },
  data: {
   archivedAt: null
  }
 })

 await pusherServer.trigger(channelForUser(userId), EVT.CONVERSATION_UPDATED, { conversationId })

 return NextResponse.json({ ok: true })
}