/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse, type NextRequest } from "next/server"
import { requireDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest) {
 const { dbUserId } = await requireDbUser()

 const rows = await prisma.participant.findMany({
  where: {
   userId: dbUserId,
   deletedAt: null,
   archivedAt: {
    not: null
   },
   conversation: {
    deletedAt: null
   }
  },
  select: {
   archivedAt: true,
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
   },
   lastSeenAt: true,
   joinedAt: true
  },
  orderBy: [
   {
    archivedAt: "desc"
   }
  ],
  take: 100
 })

 const res = await Promise.all(
  rows.map(async (row) => {
   const conversation = row.conversation
   const since = row.lastSeenAt ?? row.joinedAt
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
    lastMessage: conversation.messages[0] ?? null,
    unread,
    participants: conversation.participants.map((p) => p.user)
   }
  })
 )

 return NextResponse.json(res)
}