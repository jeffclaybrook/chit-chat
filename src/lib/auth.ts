import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "./prisma"

export async function requireDbUser() {
 const { userId: clerkUserId } = await auth()

 if (!clerkUserId) {
  throw new Response("Unauthorized", { status: 401 })
 }

 let dbUser = await prisma.user.findUnique({
  where: { clerkUserId }
 })

 if (!dbUser) {
  const client = await clerkClient()
  const user = await client.users.getUser(clerkUserId)
  const email =
   user.primaryEmailAddress?.emailAddress?.toLowerCase() ??
   user.emailAddresses[0]?.emailAddress?.toLowerCase() ??
   `user-${user.id}@placeholder.local`
   
  dbUser = await prisma.user.create({
   data: {
    clerkUserId,
    email,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl
   }
  })
 }

 return { dbUserId: dbUser.id, clerkUserId }
}