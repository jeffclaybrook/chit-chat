import { auth } from "@clerk/nextjs/server"
import { ensureUserInDb } from "./user"

export async function requireUserId() {
 const { userId } = await auth()

 if (!userId) {
  throw new Response("Unauthorized", { status: 401 })
 }

 await ensureUserInDb(userId)

 return userId
}