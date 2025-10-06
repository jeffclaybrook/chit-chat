import { Playpen_Sans } from "next/font/google"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { LogoIcon } from "@/components/Icons"
import { ThemeToggle } from "@/components/ThemeToggle"
import Link from "next/link"

const playpen_sans = Playpen_Sans({
 weight: ["400", "600"]
})

export default function Home() {
 return (
  <main className="flex flex-col h-dvh">
   <header className="flex items-center justify-between gap-2 p-2 lg:px-4">
    <Link
     href={"/"}
     aria-label="Home"
     className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-100"
    >
     <LogoIcon className="size-8" />
     <span className={`${playpen_sans.className} text-xl`}>Chit Chat</span>
    </Link>
    <div className="flex items-center justify-end gap-3 flex-1">
     <ThemeToggle />
     <Button
      type="button"
      variant="outline"
      aria-label="Sign in"
      asChild
     >
      <SignInButton />
     </Button>
    </div>
   </header>
   <section className="flex flex-col items-center justify-center gap-12 flex-1 px-2 lg:px-4">
    <div className="flex items-center justify-center h-48 w-48 rounded-3xl bg-sky-700">
     <LogoIcon className="size-40 text-white" />
    </div>
    <h1 className="text-slate-800 dark:text-slate-100 text-center text-2xl lg:text-4xl font-light">
     Chat seemlessly with <strong className={`${playpen_sans.className} font-semibold text-sky-700 dark:text-sky-200`}>Chit Chat</strong>
    </h1>
    <Button
     type="button"
     size="lg"
     aria-label="Sign up"
     className="bg-sky-700 hover:bg-sky-600"
     asChild
    >
     <SignUpButton />
    </Button>
   </section>
  </main>
 )
}