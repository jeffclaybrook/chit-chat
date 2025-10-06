import { format } from "date-fns"

export function formatDate(date?: string | null) {
 if (!date) {
  return ""
 }

 return format(new Date(date), "MMM d")
}