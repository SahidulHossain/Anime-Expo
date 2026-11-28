"use client"

import { usePathname } from "next/navigation"

export function AppContentFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const immersive = pathname === "/" || pathname.startsWith("/anime/") || pathname.startsWith("/watch/")

  return (
    <div className={`min-h-[calc(100dvh-3.5rem)] overflow-x-clip pb-[calc(7rem+env(safe-area-inset-bottom))] ${immersive ? "" : "pt-14"}`}>
      {children}
    </div>
  )
}
