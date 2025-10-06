/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { requireUserId } from "@/lib/auth"
import { cloudinarySignatureSchema } from "@/lib/validators"
import crypto from "crypto"

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
const API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!
const API_SECRET = process.env.CLOUDINARY_API_SECRET!

function sign(params: Record<string, string | number | undefined>) {
 const filtered: Record<string, string | number> = {}

 for (const [k, v] of Object.entries(params)) {
  if (v !== undefined && v !== null && v !== "") {
   filtered[k] = v as any
  }
 }

 const toSign = Object.keys(filtered)
  .sort()
  .map((k) => `${k}=${filtered[k]}`)
  .join("&")

 const hash = crypto.createHash("sha1").update(toSign + API_SECRET).digest("hex")

 return hash
}

export async function POST(req: Request) {
 await requireUserId()

 const parsed = cloudinarySignatureSchema.safeParse(await req.json())

 if (!parsed.success) {
  return NextResponse.json(parsed.error.format(), { status: 400 })
 }

 const timestamp = parsed.data.timestamp ?? Math.floor(Date.now() / 1000)
 const folder = parsed.data.folder ?? "messages"
 const public_id = parsed.data.publicId

 const params = {
  timestamp,
  folder,
  ...(public_id ? { public_id } : {})
 }

 const signature = sign(params)

 return NextResponse.json({
  cloudName: CLOUD_NAME,
  apiKey: API_KEY,
  timestamp,
  folder,
  public_id,
  signature
 })
}