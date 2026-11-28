"use client"

import Link from "next/link"
import useSWR from "swr"
import { useMemo, useState } from "react"
import { CalendarDays, Clock3, Radio, RefreshCw } from "lucide-react"

type Airing = {
  id: number
  aniListId: number
  title: string
  cover: string | null
  banner: string | null
  episode: number
  airingAt: number
  format: string | null
  year: number | null
  status: string | null
  nextAiringEpisode: { airingAt: number | null; episode: number | null } | null
}
type ScheduleResponse = { entries: Airing[]; error?: string }

const fetcher = async (url: string): Promise<ScheduleResponse> => {
  const response = await fetch(url)
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || "Could not load the airing schedule")
  return result
}

const dateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
const formatTime = (timestamp: number) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(timestamp * 1000)

function DateSelector({ dates, selected, onSelect }: { dates: Date[]; selected: string; onSelect: (key: string) => void }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Choose schedule date">
      <div className="flex min-w-max gap-2">
        {dates.map((date, index) => {
          const key = dateKey(date)
          const active = key === selected
          const label = index === 1 ? "Today" : index === 2 ? "Tomorrow" : new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date)
          return (
            <button key={key} type="button" onClick={() => onSelect(key)} aria-pressed={active}
              className={`flex w-[76px] flex-col items-center rounded-2xl border px-2 py-3 transition-colors ${active ? "border-white bg-white text-zinc-950" : "border-white/10 bg-white/[0.025] text-white hover:border-white/25 hover:bg-white/[0.06]"}`}>
              <span className={`text-[10px] font-semibold uppercase tracking-[0.13em] ${active ? "text-zinc-500" : "text-white/45"}`}>{label}</span>
              <span className="mt-1 text-2xl font-bold leading-none">{date.getDate()}</span>
              <span className={`mt-1 text-[10px] uppercase tracking-widest ${active ? "text-zinc-500" : "text-white/45"}`}>{new Intl.DateTimeFormat(undefined, { month: "short" }).format(date)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AiringCard({ airing, now }: { airing: Airing; now: number }) {
  const aired = airing.airingAt <= now
  return (
    <div className="relative flex gap-3 pb-5 sm:gap-4">
      <div className="relative flex w-[58px] shrink-0 flex-col items-end pt-3 text-right sm:w-[72px]">
        <time dateTime={new Date(airing.airingAt * 1000).toISOString()} className={`text-xs font-semibold tabular-nums sm:text-sm ${aired ? "text-white/40" : "text-white/80"}`}>{formatTime(airing.airingAt)}</time>
        <span className={`absolute right-[-21px] top-[17px] z-10 size-2.5 rounded-full border-2 border-[#101012] sm:right-[-25px] ${aired ? "bg-white/35" : "bg-primary shadow-[0_0_12px_rgba(229,9,20,.65)]"}`} />
      </div>
      <Link href={`/anime/${airing.id}`} className={`group ml-3 flex min-w-0 flex-1 overflow-hidden rounded-2xl border bg-white/[0.035] transition-colors hover:border-white/20 hover:bg-white/[0.07] sm:ml-4 ${aired ? "border-white/[0.055] opacity-75" : "border-white/[0.09]"}`}>
        <div className="relative w-[84px] shrink-0 bg-white/[0.04] sm:w-[102px]">
          {airing.cover ? <img src={airing.cover} alt={`${airing.title} cover`} loading="lazy" className="h-full min-h-[116px] w-full object-cover" /> : <div className="flex h-full min-h-[116px] items-center justify-center"><CalendarDays className="size-6 text-white/20" /></div>}
          {airing.banner && <img src={airing.banner} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover opacity-0" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="line-clamp-2 text-sm font-bold leading-snug text-white sm:text-base">{airing.title}</h2>
            {aired ? <span className="shrink-0 rounded-full bg-white/[0.08] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/50">Aired</span> : <span className="shrink-0 rounded-full bg-primary/15 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-red-200">Soon</span>}
          </div>
          <p className="mt-2 text-xs text-white/45">Episode {airing.episode}{airing.format ? ` · ${airing.format}` : ""}{airing.year ? ` · ${airing.year}` : ""}</p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-white/65"><Clock3 className="size-3.5 text-primary" />{formatTime(airing.airingAt)}{airing.status === "RELEASING" && <><span className="mx-0.5 text-white/20">/</span><Radio className="size-3 text-primary" />Currently airing</>}</div>
        </div>
      </Link>
    </div>
  )
}

export function ScheduleClient() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ScheduleResponse>("/api/schedule", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 15 * 60 * 1000,
    dedupingInterval: 5 * 60 * 1000,
    shouldRetryOnError: false,
  })
  const dates = useMemo(() => Array.from({ length: 15 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + index - 1)
    return date
  }), [])
  const [selected, setSelected] = useState(() => dateKey(new Date()))
  const selectedDate = dates.find((date) => dateKey(date) === selected) ?? dates[1]
  const daily = (data?.entries ?? []).filter((item) => dateKey(new Date(item.airingAt * 1000)) === selected).sort((a, b) => a.airingAt - b.airingAt)
  const now = Math.floor(Date.now() / 1000)
  const label = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(selectedDate)

  return (
    <main className="mx-auto min-h-[65svh] max-w-4xl px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
      <div className="mb-7 flex items-end justify-between gap-4 sm:mb-9">
        <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.26em] text-primary">Anime, on the clock</p><h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Schedule</h1><p className="mt-2 text-sm text-white/50">Find your next episode, right on time.</p></div>
        <button type="button" onClick={() => void mutate()} aria-label="Refresh schedule" className="mb-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:border-white/25 hover:bg-white/10 active:scale-95"><RefreshCw className={`size-[18px] ${isValidating ? "animate-spin" : ""}`} /></button>
      </div>

      <DateSelector dates={dates} selected={selected} onSelect={setSelected} />

      <section className="mt-8 sm:mt-10" aria-live="polite">
        <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-white">{label}</h2><p className="mt-1 text-xs text-white/40">Times shown in your local timezone</p></div><span className="rounded-full border border-white/[0.08] px-3 py-1.5 text-[10px] font-semibold text-white/55">{daily.length} {daily.length === 1 ? "episode" : "episodes"}</span></div>
        {isLoading ? <div className="space-y-3" aria-label="Loading schedule">{[0, 1, 2].map((item) => <div key={item} className="h-[116px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.025]" />)}</div> : error ? <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-9 text-center"><p className="font-semibold text-white">Schedule unavailable right now</p><p className="mt-2 text-sm text-white/45">Please try refreshing in a little while.</p><button type="button" onClick={() => void mutate()} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-bold text-black">Try again</button></div> : daily.length ? <div className="relative pt-1 before:absolute before:bottom-5 before:left-[68px] before:top-5 before:w-px before:bg-white/[0.09] sm:before:left-[84px]">{daily.map((airing) => <AiringCard key={`${airing.aniListId}-${airing.episode}`} airing={airing} now={now} />)}</div> : <div className="rounded-2xl border border-dashed border-white/[0.11] bg-white/[0.02] px-5 py-12 text-center"><CalendarDays className="mx-auto size-7 text-white/25" /><p className="mt-4 font-semibold text-white">Nothing airing on this date</p><p className="mt-2 text-sm text-white/45">Choose another day to explore upcoming episodes.</p></div>}
      </section>
    </main>
  )
}
