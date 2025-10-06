import { format, isToday, isThisWeek } from "date-fns"

export function groupLabel(dateISO: string) {
 const d = new Date(dateISO)

 if (isToday(d)) {
  return "Today"
 }

 if (isThisWeek(d, { weekStartsOn: 0 })) {
  return format(d, "EEEE")
 }

 return format(d, "EEEE, MMMM d")
}