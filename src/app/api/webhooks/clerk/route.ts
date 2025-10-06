import { NextResponse } from "next/server"
import { Webhook } from "svix"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

type ClerkEmail = {
 id: string
 email_address: string
}

type ClerkUser = {
 id: string
 first_name: string | null
 last_name: string | null
 image_url: string | null
 primary_email_address_id: string | null
 email_addresses: ClerkEmail[]
}

function primaryEmail(user: ClerkUser): string | null {
 if (user.primary_email_address_id) {
  const hit = user.email_addresses.find(email => email.id === user.primary_email_address_id)

  if (hit?.email_address) {
   return hit.email_address.toLowerCase()
  }
 }

 return user.email_addresses[0]?.email_address?.toLowerCase() ?? null
}

export async function POST(req: Request) {
 const secret = process.env.CLERK_WEBHOOK_SECRET

 if (!secret) {
  return NextResponse.json({ error: "Missing CLERK_WEBHOOK_SECRET" }, { status: 500 })
 }

 const payload = await req.text()
 const svix_id = req.headers.get("svix_id")!
 const svix_timestamp = req.headers.get("svix_timestamp")!
 const svix_signature = req.headers.get("svix_signature")!

 try {
  const wh = new Webhook(secret)
  const evt = wh.verify(payload, {
   "svix-id": svix_id,
   "svix-timestamp": svix_timestamp,
   "svix-signature": svix_signature
  }) as { type: string; data: ClerkUser }

  const { type, data } = evt

  if (type === "user.created" || type === "user.updated") {
   const email = primaryEmail(data)

   await prisma.user.upsert({
    where: {
     clerkUserId: data.id
    },
    update: {
     firstName: data.first_name ?? null,
     lastName: data.last_name ?? null,
     imageUrl: data.image_url ?? null,
     ...(email ? { email } : {})
    },
    create: {
     clerkUserId: data.id,
     email: email ?? `user-${data.id}@placeholder.local`,
     firstName: data.first_name ?? null,
     lastName: data.last_name ?? null,
     imageUrl: data.image_url ?? null
    }
   })
  }

  if (type === "user.deleted") {
   await prisma.user.updateMany({
    where: {
     clerkUserId: data.id
    },
    data: {}
   })
  }

  return NextResponse.json({ ok: true })
 } catch (error) {
  console.error("Clerk webhook verify/handle failed:", error)
  return NextResponse.json({ error: "Invalid signature or handle error" }, { status: 400 })
 }
}