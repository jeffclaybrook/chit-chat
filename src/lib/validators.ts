import { z } from "zod"

export const createDirectConversationSchema = z.object({
 otherUserId: z.string().min(1)
})

export const createGroupConversationSchema = z.object({
 title: z.string().min(1).max(80),
 avatarUrl: z.url().optional().nullable(),
 participantIds: z.array(z.string().min(1)).min(1)
})

export const listConversationsSchema = z.object({
 q: z.string().max(80).optional()
})

export const listMessagesSchema = z.object({
 conversationId: z.string().min(1),
 limit: z.coerce.number().min(1).max(100).default(30),
 cursor: z.string().optional()
})

export const sendMessageSchema = z.object({
 conversationId: z.string().min(1),
 type: z.enum(["TEXT", "IMAGE", "SYSTEM"]).default("TEXT"),
 body: z.string().max(8000).optional().nullable(),
 attachments: z
  .array(
   z.object({
    publicId: z.string().min(1),
    secureUrl: z.url(),
    width: z.number().optional(),
    height: z.number().optional(),
    bytes: z.number().optional(),
    format: z.string().optional()
   })
  )
})

export const markReadSchema = z.object({
 conversationId: z.string().min(1),
 messageId: z.string().min(1)
})

export const updateConversationSchema = z.object({
 title: z.string().min(1).max(80).optional(),
 avatarUrl: z.url().optional().nullable(),
 isArchived: z.boolean().optional()
})

export const modifyParticipantsSchema = z.object({
 add: z.array(z.string()).optional().default([]),
 remove: z.array(z.string()).optional().default([])
})

export const cloudinarySignatureSchema = z.object({
 folder: z.string().optional(),
 publicId: z.string().optional(),
 timestamp: z.number().optional()
})