import { NextResponse } from "next/server"
import { requireDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
 const { clerkUserId } = await requireDbUser()
 const url = new URL(req.url)
 const q = (url.searchParams.get("q") ?? "").trim()

 const users = await prisma.user.findMany({
  where: {
   clerkUserId: {
    not: clerkUserId
   },
   ...(q
    ? {
     OR: [
      {
       firstName: {
        contains: q,
        mode: "insensitive"
       }
      },
      {
       lastName: {
        contains: q,
        mode: "insensitive"
       }
      },
      {
       email: {
        contains: q,
        mode: "insensitive"
       }
      }
     ]
    }
    : {}
   )
  },
  orderBy: [
   {
    firstName: "asc"
   },
   {
    lastName: "asc"
   }
  ],
  take: 50,
  select: {
   id: true,
   clerkUserId: true,
   firstName: true,
   lastName: true,
   imageUrl: true
  }
 })

 return NextResponse.json(users)
}