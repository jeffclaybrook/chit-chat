import { ReactNode } from "react"
import { cookies } from "next/headers"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ConversationsSidebar } from "@/components/ConversationsSidebar"

export default async function Layout({
 children
}: Readonly<{
 children: ReactNode
}>) {
 const cookieStore = await cookies()
 const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

 return (
  <SidebarProvider defaultOpen={defaultOpen}>
   <ConversationsSidebar />
   <main className="flex-1">{children}</main>
  </SidebarProvider>
 )
}