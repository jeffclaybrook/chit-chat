import { NextResponse, type NextRequest } from "next/server"
import { requireDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { channelForUser, EVT, pusherServer } from "@/lib/pusher/server"

export const runtime = "nodejs"

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
 const { dbUserId } = await requireDbUser()

 await ensureMember(conversationId, dbUserId)

 await prisma.participant.update({
  where: {
   conversationId_userId: {
    conversationId,
    userId: dbUserId
   }
  },
  data: {
   archivedAt: new Date()
  }
 })

 await pusherServer.trigger(channelForUser(dbUserId), EVT.CONVERSATION_UPDATED, { conversationId })

 return NextResponse.json({ ok: true })
}

export async function DELETE(
 _req: NextRequest,
 ctx: Ctx<{ conversationId: string }>
) {
 const { conversationId } = await ctx.params
 const { dbUserId } = await requireDbUser()

 await ensureMember(conversationId, dbUserId)

 await prisma.participant.update({
  where: {
   conversationId_userId: {
    conversationId,
    userId: dbUserId
   }
  },
  data: {
   archivedAt: null
  }
 })

 await pusherServer.trigger(channelForUser(dbUserId), EVT.CONVERSATION_UPDATED, { conversationId })

 return NextResponse.json({ ok: true })
}