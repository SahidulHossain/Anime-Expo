"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bookmark, Grid2X2, History, Home, Search } from "lucide-react"
import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/genres", label: "Genres", icon: Grid2X2 },
  { href: "/search", label: "Search", icon: Search },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/history", label: "History", icon: History },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Primary navigation" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-xl rounded-2xl border border-white/10 bg-black/80 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl md:inset-x-4 md:bottom-4">
      <div className="grid grid-cols-5 gap-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link key={href} href={href} className={cn("relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-[color,background-color,transform] duration-200 active:scale-95 sm:text-xs", active ? "bg-white/[0.08] text-white after:absolute after:inset-x-4 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary" : "text-white/55 hover:bg-white/[0.06] hover:text-white")}>
              <Icon className="size-4 sm:size-[18px]" strokeWidth={active ? 2.5 : 2} />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
