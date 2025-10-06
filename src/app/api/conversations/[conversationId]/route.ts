import { NextResponse, type NextRequest } from "next/server"
import { requireDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateConversationSchema } from "@/lib/validators"
import { channelForConversation, channelForUser, EVT, pusherServer } from "@/lib/pusher/server"

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
   id: true,
   conversation: {
    select: {
     type: true,
     deletedAt: true
    }
   }
  }
 })

 if (!member || member.conversation.deletedAt) {
  throw new Response("Not found", { status: 404 })
 }

 return member
}

export async function GET(
 _req: NextRequest,
 ctx: Ctx<{ conversationId: string }>
) {
 const { conversationId } = await ctx.params
 const { dbUserId } = await requireDbUser()

 await ensureMember(conversationId, dbUserId)

 const conversation = await prisma.conversation.findUnique({
  where: {
   id: conversationId
  },
  include: {
   participants: {
    include: {
     user: true
    }
   },
   messages: {
    take: 1,
    orderBy: [
     {
      createdAt: "desc"
     },
     {
      id: "desc"
     }
    ],
    select: {
     id: true,
     createdAt: true
    }
   }
  }
 })

 return NextResponse.json(conversation)
}

export async function PATCH(
 req: NextRequest,
 ctx: Ctx<{ conversationId: string }>
) {
 const { conversationId } = await ctx.params
 const { dbUserId } = await requireDbUser()
 const member = await ensureMember(conversationId, dbUserId)
 const payload = await req.json()
 const parsed = updateConversationSchema.safeParse(payload)

 if (!parsed.success) {
  return NextResponse.json(parsed.error.format(), { status: 400 })
 }

 const data = parsed.data

 if ((data.title !== undefined || data.avatarUrl !== undefined) && member.conversation.type !== "GROUP") {
  return NextResponse.json({ error: "Only group conversations can be renamed or have avatars" }, { status: 400 })
 }

 const updated = await prisma.conversation.update({
  where: {
   id: conversationId
  },
  data: {
   ...(data.title !== undefined ? { title: data.title } : {}),
   ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
   ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {})
  },
  include: {
   participants: {
    select: {
     userId: true
    }
   }
  }
 })

 await pusherServer.trigger(channelForConversation(updated.id), EVT.CONVERSATION_UPDATED, { conversationId: updated.id })
 await Promise.all(
  updated.participants.map((p) =>
   pusherServer.trigger(channelForUser(p.userId), EVT.CONVERSATION_UPDATED, { conversationId: updated.id })
  )
 )

 return NextResponse.json(updated)
}

export async function DELETE(
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

 const conversation = await prisma.conversation.update({
  where: {
   id: conversationId
  },
  data: {
   deletedAt: new Date()
  }
 })

 await pusherServer.trigger(channelForConversation(conversation.id), EVT.CONVERSATION_DELETED, { conversationId: conversation.id })
 await Promise.all(
  participant.conversation.participants.map((p) =>
   pusherServer.trigger(channelForUser(p.userId), EVT.CONVERSATION_DELETED, { conversationId: conversation.id })
  )
 )

 return NextResponse.json({ ok: true })
}