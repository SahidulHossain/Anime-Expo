"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface PosterImageProps {
  src?: string
  alt: string
  className?: string
  sizes?: string
}

export function PosterImage({ src, alt, className }: PosterImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  return (
    <div className={cn("relative overflow-hidden bg-secondary", className)}>
      {!loaded && !errored && <div className="absolute inset-0 animate-pulse bg-secondary" />}
      {src && !errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src || "/placeholder.svg"}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-secondary text-center text-xs text-muted-foreground">
          No image
        </div>
      )}
    </div>
  )
}
