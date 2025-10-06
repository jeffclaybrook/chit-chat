import { NextResponse } from "next/server"
import { requireDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createDirectConversationSchema, createGroupConversationSchema, listConversationsSchema } from "@/lib/validators"
import { channelForUser, EVT, pusherServer } from "@/lib/pusher/server"

export const runtime = "nodejs"

export async function GET(req: Request) {
 const { dbUserId } = await requireDbUser()
 const url = new URL(req.url)
 const parsed = listConversationsSchema.safeParse({ q: url.searchParams.get("q") ?? undefined})

 if (!parsed.success) {
  return NextResponse.json(parsed.error.format(), { status: 400 })
 }

 const { q } = parsed.data

 const baseConvos = await prisma.participant.findMany({
  where: {
   userId: dbUserId,
   deletedAt: null,
   archivedAt: null,
   conversation: {
    deletedAt: null
   }
  },
  select: {
   lastSeenAt: true,
   joinedAt: true,
   conversation: {
    select: {
     id: true,
     type: true,
     title: true,
     avatarUrl: true,
     lastMessageAt: true,
     participants: {
      select: {
       user: {
        select: {
         id: true,
         firstName: true,
         lastName: true,
         imageUrl: true
        }
       }
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
       body: true,
       type: true,
       hasImage: true,
       createdAt: true,
       authorId: true
      }
     }
    }
   }
  },
  orderBy: [
   {
    conversation: {
     lastMessageAt: "desc"
    }
   }
  ],
  take: 50
 })

 const filtered = q
  ? baseConvos.filter(({ conversation }) => {
   const title = conversation.title?.toLowerCase() ?? ""
   const otherNames = conversation.participants
    .map((p) => `${p.user.firstName ?? ""} ${p.user.lastName ?? ""}`.trim().toLowerCase())
    .join(" ")
   return title.includes(q.toLowerCase()) || otherNames.includes(q.toLowerCase())
  })
  : baseConvos

 const res = await Promise.all(
  filtered.map(async ({ lastSeenAt, joinedAt, conversation }) => {
   const since = lastSeenAt ?? joinedAt
   const lastMessage = conversation.messages[0] ?? null
   const lastAt = lastMessage?.createdAt ?? conversation.lastMessageAt
   const isUnread = !!(lastAt && (!since || lastAt > since))

   const unread = await prisma.message.count({
    where: {
     conversationId: conversation.id,
     deletedAt: null,
     authorId: {
      not: dbUserId
     },
     ...(since ? { createdAt: { gt: since } } : {})
    }
   })

   return {
    ...conversation,
    lastMessage: lastMessage,
    participants: conversation.participants.map((p) => p.user),
    unread,
    isUnread
   }
  })
 )

 return NextResponse.json(res)
}

export async function POST(req: Request) {
 const { dbUserId} = await requireDbUser()
 const body = await req.json()
 const directParsed = createDirectConversationSchema.safeParse(body)
 const groupParsed = createGroupConversationSchema.safeParse(body)

 if (directParsed.success) {
  const { otherUserId } = directParsed.data

  if (otherUserId === dbUserId) {
   return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 })
  }

  const other = await prisma.user.findUnique({
   where: {
    id: otherUserId
   },
   select: {
    id: true
   }
  })

  if (!other) {
   return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const [a, b] = [dbUserId, otherUserId].sort()
  const pairKey = `${a}|${b}`

  const conversation = await prisma.conversation.upsert({
   where: { pairKey },
   update: {},
   create: {
    type: "DIRECT",
    pairKey,
    participants: {
     createMany: {
      data: [
       {
        userId: a,
        joinedAt: new Date()
       },
       {
        userId: b,
        joinedAt: new Date()
       }
      ]
     }
    }
   },
   include: {
    participants: {
     include: {
      user: true
     }
    }
   }
  })

  await Promise.all([
   pusherServer.trigger(channelForUser(a), EVT.CONVERSATION_CREATED, { conversationId: conversation.id }),
   pusherServer.trigger(channelForUser(b), EVT.CONVERSATION_CREATED, { conversationId: conversation.id })
  ])

  return NextResponse.json(conversation, { status: 201 })
 }

 if (groupParsed.success) {
  const { title, avatarUrl, participantIds } = groupParsed.data
  const uniqueIds = Array.from(new Set([dbUserId, ...participantIds]))

  const conversation = await prisma.conversation.create({
   data: {
    type: "GROUP",
    title,
    avatarUrl: avatarUrl ?? undefined,
    createdById: dbUserId,
    participants: {
     create: uniqueIds.map((id) => ({ userId: id }))
    }
   },
   include: {
    participants: {
     include: {
      user: true
     }
    }
   }
  })

  await Promise.all(
   uniqueIds.map((id) =>
    pusherServer.trigger(channelForUser(id), EVT.CONVERSATION_CREATED, { conversationId: conversation.id })
   )
  )

  return NextResponse.json(conversation, { status: 201 })
 }

 return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
}