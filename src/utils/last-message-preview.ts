import { LastMessageType } from "@/types"

export function lastMessagePreview(message?: LastMessageType | null) {
 if (!message) {
  return ""
 }

 if (message.hasImage || message.type === "IMAGE") {
  return "[IMAGE]"
 }

 if (message.type === "SYSTEM") {
  return message.body ? `• ${message.body}` : "[SYSTEM]"
 }

 return message.body ?? ""
}