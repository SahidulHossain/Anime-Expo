"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { CalendarDays } from "lucide-react"
import { LOGO_URL } from "@/lib/site"

const SCROLL_THRESHOLD = 10
const TOP_REVEAL_DISTANCE = 12

export function SiteHeader() {
  const [visible, setVisible] = useState(true)
  const visibleRef = useRef(true)

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (reducedMotion.matches) return

    let previousY = Math.max(0, window.scrollY)
    let direction = 0
    let distance = 0
    let frame = 0

    const reveal = () => {
      if (visibleRef.current) return
      visibleRef.current = true
      setVisible(true)
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const currentY = Math.max(0, window.scrollY)
        const delta = currentY - previousY
        previousY = currentY

        if (currentY <= TOP_REVEAL_DISTANCE) {
          direction = 0
          distance = 0
          reveal()
          return
        }
        if (Math.abs(delta) < 1) return

        const nextDirection = delta > 0 ? 1 : -1
        if (nextDirection !== direction) {
          direction = nextDirection
          distance = 0
        }
        distance += Math.abs(delta)
        if (distance < SCROLL_THRESHOLD) return
        distance = 0

        const shouldShow = direction < 0
        if (visibleRef.current !== shouldShow) {
          visibleRef.current = shouldShow
          setVisible(shouldShow)
        }
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-[env(safe-area-inset-top)] z-40 px-3 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none sm:px-5 ${visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"}`}
      aria-hidden={!visible}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between rounded-2xl border border-white/[0.09] bg-zinc-950/55 px-3 shadow-[0_8px_28px_rgba(0,0,0,.24),inset_0_1px_0_rgba(255,255,255,.045)] backdrop-blur-md sm:h-[60px] sm:px-5">
        <Link href="/" tabIndex={visible ? 0 : -1} className="inline-flex min-h-11 min-w-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="AnimExpo home">
          <img src={LOGO_URL} alt="AnimExpo" className="h-7 max-w-[min(58vw,200px)] object-contain object-left drop-shadow-[0_1px_5px_rgba(0,0,0,.55)] sm:h-8 sm:max-w-[240px]" />
        </Link>
        <Link href="/schedule" tabIndex={visible ? 0 : -1} aria-label="Anime Schedule" title="Anime Schedule" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-white/90 transition-[background-color,border-color,transform,color] hover:border-primary/45 hover:bg-white/[0.08] hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <CalendarDays className="size-[19px]" strokeWidth={1.9} />
        </Link>
      </div>
    </header>
  )
}
