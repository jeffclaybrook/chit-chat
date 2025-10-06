"use client"

import { KeyboardEvent, useEffect, useRef, useState } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { AttachIcon, SendIcon } from "./Icons"

export function ChatInput({
 conversationId
}: {
 conversationId: string
}) {
 const [value, setValue] = useState<string>("")
 const [sending, setSending] = useState<boolean>(false)
 const [uploading, setUploading] = useState<boolean>(false)
 const fileRef = useRef<HTMLInputElement | null>(null)
 const textareaRef = useRef<HTMLTextAreaElement | null>(null)

 const autoGrow = () => {
  const textarea = textareaRef.current

  if (!textarea) {
   return
  }

  textarea.style.height = "0px"
  textarea.style.height = Math.min(textarea.scrollHeight, 180) + "px"
 }

 useEffect(() => {
  autoGrow()
 }, [value])

 const sendText = async () => {
  const body = value.trim()

  if (!body) {
   return
  }

  try {
   setSending(true)

   await fetch("/api/messages", {
    method: "POST",
    headers: {
     "Content-Type": "application/json"
    },
    body: JSON.stringify({
     conversationId,
     type: "TEXT",
     body,
     attachments: []
    })
   })

   setValue("")
  } finally {
   setSending(false)
  }
 }

 const handleFiles = async (files: FileList | null) => {
  if (!files || files.length === 0) {
   return
  }

  const file = files[0]

  try {
   setUploading(true)

   const signature = await fetch("/api/attachments", {
    method: "POST",
    headers: {
     "Content-Type": "application/json"
    },
    body: JSON.stringify({ folder: "messages" })
   }).then((res) => res.json())

   const form = new FormData()

   form.append("file", file)
   form.append("api_key", signature.apiKey)
   form.append("timestamp", String(signature.timestamp))
   form.append("folder", signature.folder)

   if (signature.public_id) {
    form.append("public_id", signature.public_id)
   }

   form.append("signature", signature.signature)

   const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/auto/upload`, {
    method: "POST",
    body: form
   })

   const json = await uploadRes.json()

   await fetch("/api/messages", {
    method: "POST",
    headers: {
     "Content-Type": "application/json"
    },
    body: JSON.stringify({
     conversationId,
     type: "IMAGE",
     attachments: [
      {
       publicId: json.public_id,
       secureUrl: json.secure_url,
       width: json.width,
       height: json.height,
       bytes: json.bytes,
       format: json.format
      }
     ]
    })
   })

   if (fileRef.current) {
    fileRef.current.value = ""
   }
  } finally {
   setUploading(false)
  }
 }

 const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter" && !e.shiftKey) {
   e.preventDefault()

   if (!sending) {
    sendText()
   }
  }
 }

 return (
  <div className="sticky bottom-0 z-20 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
   <div className="max-w-3xl px-3 py-2 mx-auto">
    <div className="flex items-end gap-2">
     <div className="relative flex-1">
      <Textarea
       ref={textareaRef}
       value={value}
       onChange={e => setValue(e.target.value)}
       onKeyDown={onKeyDown}
       placeholder="Write a message..."
       className="resize-none pr-10 min-h-[44px] max-h-44"
      />
      <button
       type="button"
       aria-label="Attach image"
       onClick={() => fileRef.current?.click()}
       title="Attach image"
      >
       <AttachIcon className="size-4" />
      </button>
      <input
       ref={fileRef}
       type="file"
       accept="image/*"
       onChange={e => handleFiles(e.target.files)}
       className="hidden"
      />
     </div>
     <Button
      type="button"
      size="icon"
      aria-label="Send message"
      onClick={sendText}
      disabled={sending || uploading || !value.trim()}
     >
      <SendIcon className="size-4" />
     </Button>
    </div>
    {(sending || uploading) && <div className="text-xs text-muted-foreground mt-1">{uploading ? "Uploading..." : "Sending..."}</div>}
   </div>
  </div>
 )
}