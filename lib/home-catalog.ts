import "server-only"

import type { AnimeSummary } from "@/lib/types"

export const TOP_RATED_TITLES = [
  "Frieren: Beyond Journey's End", "Fullmetal Alchemist: Brotherhood", "Steins;Gate", "Attack on Titan", "Gintama", "Hunter x Hunter", "Monster", "Bleach: Thousand-Year Blood War", "Vinland Saga", "Legend of the Galactic Heroes", "Cowboy Bebop", "Code Geass: Lelouch of the Rebellion", "Death Note", "Neon Genesis Evangelion", "Mob Psycho 100", "Clannad: After Story", "Jujutsu Kaisen", "Chainsaw Man", "Cyberpunk: Edgerunners", "Demon Slayer: Kimetsu no Yaiba", "One Piece", "Kaguya-sama: Love Is War", "Bocchi the Rock!", "The Apothecary Diaries", "Haikyu!!", "Pluto", "Mushishi", "Ping Pong the Animation", "Odd Taxi", "Re:Zero - Starting Life in Another World", "Tengen Toppa Gurren Lagann", "Samurai Champloo", "Made in Abyss", "Fate/Zero", "Ghost in the Shell: Stand Alone Complex", "Dororo", "Erased", "Yu Yu Hakusho", "Your Lie in April", "Yona of the Dawn", "The Promised Neverland", "Yowamushi Pedal", "The Tatami Galaxy", "Laid-Back Camp", "Yu-Gi-Oh! Duel Monsters", "Call of the Night", "Yamada-kun and the Seven Witches", "The Saga of Tanya the Evil", "Ya Boy Kongming!", "Yuri!!! on Ice", "The Wallflower", "My Teen Romantic Comedy SNAFU", "Spirited Away", "Your Name", "A Silent Voice", "Princess Mononoke", "Perfect Blue",
]

const ALIASES: Record<string, string[]> = {
  "Frieren: Beyond Journey's End": ["Sousou no Frieren"],
  "Fullmetal Alchemist: Brotherhood": ["Hagane no Renkinjutsushi"],
  "The Apothecary Diaries": ["Kusuriya no Hitorigoto"],
  "Haikyu!!": ["Haikyuu!!"],
  "Re:Zero - Starting Life in Another World": ["Re Zero", "Re:ZERO -Starting Life in Another World-"],
  "My Teen Romantic Comedy SNAFU": ["Oregairu", "Yahari Ore no Seishun Love Comedy wa Machigatteiru"],
  "Mushishi": ["Mushi-Shi"],
  "Clannad: After Story": ["Clannad ~After Story~"],
  "Kaguya-sama: Love Is War": ["Kaguya-sama: Love is War"],
  "Erased": ["ERASED"],
  "Yuri!!! on Ice": ["Yuri!!! On ICE"],
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "")
}

function titleKey(title: string) {
  return normalizeTitle(title)
}

export function getTopRatedPicks(items: AnimeSummary[]): AnimeSummary[] {
  const byKey = new Map(items.map((item) => [titleKey(item.title), item]))
  const results: AnimeSummary[] = []

  TOP_RATED_TITLES.forEach((title) => {
    const names = [title, ...(ALIASES[title] ?? [])]
    const exact = names.map(titleKey).map((key) => byKey.get(key)).find(Boolean)
    if (exact) {
      results.push(exact)
      return
    }

    const keys = names.map(titleKey)
    const variant = items
      .filter((item) => keys.some((key) => new RegExp(`^${key}(season|part|cour|thefinalseason|finalseason)\\d*$`).test(titleKey(item.title))))
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0]
    if (variant) results.push(variant)
  })

  return Array.from(new Map(results.map((item) => [item.id, item])).values())
}

export function getUpcoming(items: AnimeSummary[]): AnimeSummary[] {
  const now = new Date().getFullYear()
  return items.filter((item) => {
    const status = (item.status ?? "").toLowerCase()
    return /upcoming|announced|not yet aired|planned/.test(status) || (Boolean(item.year) && Number(item.year) > now && /movie|film|tv|ova|special/i.test(item.type ?? ""))
  }).slice(0, 24)
}
