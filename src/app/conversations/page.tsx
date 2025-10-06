import { SidebarTrigger } from "@/components/ui/sidebar"
import { EmptyIcon } from "@/components/Icons"

export default function Conversations() {
 return (
  <>
   <header className="flex items-center p-4 border-b border-slate-100">
    <SidebarTrigger />
   </header>
   <section className="flex items-center justify-center py-24 overflow-hidden">
    <EmptyIcon className="size-64 md:size-96 text-sky-700" />
   </section>
  </>
 )
}