"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Search, Bookmark, History as HistoryIcon, Home, Menu, X, LayoutGrid, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { CONTACT_URL } from "@/lib/site"

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/browse", label: "Browse", icon: LayoutGrid },
  { href: "/search", label: "Search", icon: Search },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/history", label: "History", icon: HistoryIcon },
]

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight">
          <span className="text-primary">ANIME</span>
          <span className="text-foreground"> EXPO</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            )
          })}
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact Us
          </a>
        </nav>

        <form onSubmit={submit} className="ml-auto hidden max-w-xs flex-1 md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anime..."
              aria-label="Search anime"
              className="h-10 w-full rounded-full border border-border bg-secondary/60 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60"
            />
          </div>
        </form>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto inline-flex size-10 items-center justify-center rounded-md text-foreground md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background px-4 py-3 md:hidden">
          <form onSubmit={submit} className="mb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anime..."
                aria-label="Search anime"
                className="h-11 w-full rounded-full border border-border bg-secondary/60 pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
              />
            </div>
          </form>
          <nav className="grid gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                    active ? "bg-secondary text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              )
            })}
            <a
              href={CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <Send className="size-4" />
              Contact Us
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
