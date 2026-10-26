"use client"

import { useState } from "react"
import { Check, Copy, Share2 } from "lucide-react"

function fallbackCopy(value: string) {
  const input = document.createElement("textarea")
  input.value = value
  input.setAttribute("readonly", "")
  input.style.position = "fixed"
  input.style.opacity = "0"
  document.body.appendChild(input)
  input.select()
  const copied = document.execCommand("copy")
  input.remove()
  if (!copied) throw new Error("Copy failed")
}

export function ShareButton({ animeId, title }: { animeId: number; title: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle")
  const [showCopy, setShowCopy] = useState(false)
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/anime/${animeId}`

  async function copyLink() {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url)
      else fallbackCopy(url)
      setStatus("copied")
      setShowCopy(false)
      window.setTimeout(() => setStatus("idle"), 2200)
    } catch {
      setStatus("error")
      setShowCopy(true)
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // Canceled native shares fall through to the copy option.
      }
    }
    setShowCopy(true)
  }

  return <div className="relative">
    <button type="button" aria-label="Share anime" onClick={share} className="rounded-full border border-white/10 bg-black/30 p-2.5 text-white hover:border-primary"><Share2 className="size-5" /></button>
    {showCopy && <div className="absolute right-0 top-12 z-20 w-64 rounded-xl border border-border bg-card p-3 shadow-xl"><p className="text-xs text-muted-foreground">Copy this anime link</p><button type="button" onClick={copyLink} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Copy className="size-4" />Copy link</button>{status === "error" && <p className="mt-2 break-all text-xs text-destructive">Copy failed. Select the URL manually: {url}</p>}</div>}
    {status === "copied" && <div role="status" className="absolute right-0 top-12 z-20 flex items-center gap-2 whitespace-nowrap rounded-lg border border-primary/40 bg-card px-3 py-2 text-xs font-semibold text-primary"><Check className="size-4" />Anime link copied!</div>}
  </div>
}
