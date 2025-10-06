"use client"

import { SidebarTrigger } from "./ui/sidebar"

export function ChatHeader({
 type,
 title
}: {
 type: "DIRECT" | "GROUP"
 title: string
}) {
 return (
  <header className="flex items-center gap-2 sticky top-0 z-20 border-b border-slate-100 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
   <SidebarTrigger />
   <div className="font-semibold truncate">{title}</div>
   {type === "GROUP" ? <span className="text-xs text-muted-foreground ml-2 rounded bg-muted px-2 py-0.5">Group</span> : null}
  </header>
 )
}