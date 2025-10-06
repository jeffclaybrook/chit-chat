import { clerkClient } from "@clerk/nextjs/server"
import { prisma } from "./prisma"

export async function ensureUserInDb(clerkUserId: string) {
 const client = await clerkClient()
 const user = await client.users.getUser(clerkUserId)

 const email =
  user.primaryEmailAddress?.emailAddress?.toLowerCase() ??
  user.emailAddresses[0]?.emailAddress?.toLowerCase() ??
  `user-${user.id}@placeholder.local`

 return prisma.user.upsert({
  where: {
   clerkUserId: user.id
  },
  update: {},
  create: {
   clerkUserId: user.id,
   email,
   firstName: user.firstName,
   lastName: user.lastName,
   imageUrl: user.imageUrl
  }
 })
}