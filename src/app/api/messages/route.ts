/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { requireDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { listMessagesSchema, sendMessageSchema } from "@/lib/validators"
import { channelForConversation, EVT, pusherServer } from "@/lib/pusher/server"

export const runtime = "nodejs"

function cursorTuple(
 createdAt: Date,
 id: string
) {
 return `${createdAt.toISOString()}::${id}`
}

export async function GET(req: Request) {
 const { dbUserId } = await requireDbUser()
 const url = new URL(req.url)

 const parsed = listMessagesSchema.safeParse({
  conversationId: url.searchParams.get("conversationId"),
  limit: url.searchParams.get("limit") ?? undefined,
  cursor: url.searchParams.get("cursor") ?? undefined
 })

 if (!parsed.success) {
  return NextResponse.json(parsed.error.format(), { status: 400 })
 }

 const { conversationId, limit, cursor } = parsed.data

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

 let cursorParts: [Date, string] | undefined

 if (cursor) {
  const [iso, id] = cursor.split("::")
  cursorParts = [new Date(iso), id]
 }

 const messages = await prisma.message.findMany({
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
  take: limit + 1,
  ...(cursorParts
   ? {
    cursor: {
     createdAt_id: {
      createdAt: cursorParts[0],
      id: cursorParts[1]
     } as any
    },
    skip: 1
   }
   : {}
  ),
  include: {
   author: {
    select: {
     id: true,
     firstName: true,
     lastName: true,
     imageUrl: true
    }
   },
   attachments: true,
   readReceipts: {
    select: {
     userId: true,
     seenAt: true
    }
   }
  }
 })

 const hasMore = messages.length > limit
 const sliced = hasMore ? messages.slice(0, -1) : messages
 const nextCursor = hasMore ? cursorTuple(sliced[sliced.length - 1].createdAt, sliced[sliced.length - 1].id) : null

 return NextResponse.json({ items: sliced.reverse(), nextCursor })
}

export async function POST(req: Request) {
 const { dbUserId } = await requireDbUser()
 const parsed = sendMessageSchema.safeParse(await req.json())

 if (!parsed.success) {
  return NextResponse.json(parsed.error.format(), { status: 400 })
 }

 const { conversationId, type, body, attachments } = parsed.data

 const participants = await prisma.participant.findMany({
  where: { conversationId },
  select: {
   userId: true
  }
 })

 const membership = await prisma.participant.findUnique({
  where: {
   conversationId_userId: {
    conversationId,
    userId: dbUserId
   }
  },
  include: {
   conversation: {
    select: {
     id: true
    }
   }
  }
 })

 if (!membership || membership.deletedAt) {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
 }

 const created = await prisma.$transaction(async (tx) => {
  const message = await tx.message.create({
   data: {
    conversationId,
    authorId: dbUserId,
    type,
    body: body ?? null,
    hasImage: (attachments?.length ?? 0) > 0
   },
   include: {
    attachments: true
   }
  })

  if (attachments?.length) {
   await tx.attachment.createMany({
    data: attachments.map((a) => ({
     messageId: message.id,
     conversationId,
     uploaderId: dbUserId,
     publicId: a.publicId,
     secureUrl: a.secureUrl,
     width: a.width,
     height: a.height,
     bytes: a.bytes,
     format: a.format
    }))
   })
  }

  await tx.messageReadReceipt.upsert({
   where: {
    messageId_userId: {
     messageId: message.id,
     userId: dbUserId
    }
   },
   create: {
    messageId: message.id,
    userId: dbUserId
   },
   update: {
    seenAt: new Date()
   }
  })

  await tx.conversation.update({
   where: {
    id: conversationId
   },
   data: {
    lastMessageAt: new Date()
   }
  })

  const full = await tx.message.findUnique({
   where: {
    id: message.id
   },
   include: {
    author: {
     select: {
      id: true,
      firstName: true,
      lastName: true,
      imageUrl: true
     }
    },
    attachments: true,
    readReceipts: true
   }
  })

  return full!
 })

 await pusherServer.trigger(channelForConversation(conversationId), EVT.MESSAGE_NEW, { message: created })
 await Promise.all(
  participants.map((p) =>
   import("@/lib/pusher/server").then(({ pusherServer, channelForUser, EVT }) =>
    pusherServer.trigger(channelForUser(p.userId), EVT.MESSAGE_NEW, { conversationId })
   )
  )
 )

 return NextResponse.json(created, { status: 201 })
}