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
  "Re:Zero - Starting Life in Another World": ["Re Zero"],
  "My Teen Romantic Comedy SNAFU": ["Oregairu", "Yahari Ore no Seishun Love Comedy wa Machigatteiru"],
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "")
}

function titleKey(title: string) {
  return normalizeTitle(title)
}

export function getTopRatedPicks(items: AnimeSummary[]): AnimeSummary[] {
  const requested = new Map<string, number>()
  TOP_RATED_TITLES.forEach((title, index) => requested.set(titleKey(title), index))
  for (const [title, names] of Object.entries(ALIASES)) {
    const position = requested.get(titleKey(title))
    if (position !== undefined) for (const name of names) requested.set(titleKey(name), position)
  }
  const matches = items.filter((item) => {
    const key = titleKey(item.title)
    return requested.has(key) || [...requested.keys()].some((candidate) => key.startsWith(candidate) || candidate.startsWith(key))
  })
  return Array.from(new Map(matches.sort((a, b) => {
    const ai = requested.get(titleKey(a.title)) ?? TOP_RATED_TITLES.findIndex((title) => titleKey(a.title).startsWith(titleKey(title)))
    const bi = requested.get(titleKey(b.title)) ?? TOP_RATED_TITLES.findIndex((title) => titleKey(b.title).startsWith(titleKey(title)))
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi)
  }).map((item) => [item.id, item])).values())
}

export function getUpcoming(items: AnimeSummary[]): AnimeSummary[] {
  const now = new Date().getFullYear()
  return items.filter((item) => {
    const status = (item.status ?? "").toLowerCase()
    return /upcoming|announced|not yet aired|planned/.test(status) || (Boolean(item.year) && Number(item.year) > now && /movie|film|tv|ova|special/i.test(item.type ?? ""))
  }).slice(0, 24)
}
