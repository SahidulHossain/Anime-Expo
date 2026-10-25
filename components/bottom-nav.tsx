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
    <nav aria-label="Primary navigation" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-white/10 bg-black/75 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl pb-[calc(0.375rem+env(safe-area-inset-bottom))] md:inset-x-4 md:bottom-4">
      <div className="grid grid-cols-5 gap-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link key={href} href={href} className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors sm:text-xs", active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-white/60 hover:bg-white/10 hover:text-white")}>
              <Icon className="size-4 sm:size-[18px]" strokeWidth={active ? 2.5 : 2} />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
