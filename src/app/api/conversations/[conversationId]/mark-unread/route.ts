import { NextResponse, type NextRequest } from "next/server"
import { requireDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx<T> = {
 params: Promise<T>
}

export async function POST(
 _req: NextRequest,
 ctx: Ctx<{ conversationId: string }>
) {
 const { conversationId } = await ctx.params
 const { dbUserId } = await requireDbUser()

 const member = await prisma.participant.findUnique({
  where: {
   conversationId_userId: {
    conversationId,
    userId: dbUserId
   }
  },
  select: {
   id: true
  }
 })

 if (!member) {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
 }

 const last = await prisma.message.findFirst({
  where: {
   conversationId,
   deletedAt: null
  },
  orderBy: [
   {
    createdAt: "desc"
   },
   {
    id: "desc"
   }
  ],
  select: {
   createdAt: true
  }
 })

 const markAt = last ? new Date(last.createdAt.getTime() - 1) : new Date(0)

 await prisma.participant.update({
  where: {
   conversationId_userId: {
    conversationId,
    userId: dbUserId
   }
  },
  data: {
   lastSeenAt: markAt,
   lastSeenMessageId: null
  }
 })

 return NextResponse.json({ ok: true })
}