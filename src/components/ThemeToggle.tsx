"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { MonitorIcon, MoonIcon, SunIcon } from "./Icons"

const themes = [
 { label: "Light", value: "light", Icon: SunIcon },
 { label: "Dark", value: "dark", Icon: MoonIcon },
 { label: "System", value: "system", Icon: MonitorIcon }
]

export function ThemeToggle() {
 const [mounted, setMounted] = useState<boolean>(false)
 const { setTheme, theme, resolvedTheme } = useTheme()

 useEffect(() => {
  setMounted(true)
 }, [])

 if (!mounted) {
  return null
 }

 return (
  <DropdownMenu>
   <DropdownMenuTrigger asChild>
    <Button
     type="button"
     variant="ghost"
     size="icon"
     aria-label="Toggle theme"
    >
     {resolvedTheme === "dark"
      ? <MoonIcon className="size-6" />
      : <SunIcon className="size-6" />
     }
     <span className="sr-only">Toggle theme</span>
    </Button>
   </DropdownMenuTrigger>
   <DropdownMenuContent align="end">
    {themes.map(({ label, value, Icon }) => (
     <DropdownMenuItem
      key={value}
      onClick={() => setTheme(value)}
      className={cn(
       "cursor-pointer",
       theme === value && "bg-accent text-accent-foreground"
      )}
     >
      <Icon className="size-4" />
      {label}
     </DropdownMenuItem>
    ))}
   </DropdownMenuContent>
  </DropdownMenu>
 )
}