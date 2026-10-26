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
  return title.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function getTopRatedPicks(items: AnimeSummary[]): AnimeSummary[] {
  const aliases = Object.entries(ALIASES).flatMap(([title, names]) => names.map((name) => [normalizeTitle(name), normalizeTitle(title)] as const))
  const requested = new Map(TOP_RATED_TITLES.map((title, index) => [normalizeTitle(title), index]))
  for (const [alias, canonical] of aliases) requested.set(alias, requested.get(canonical) ?? 0)
  return Array.from(new Map(items.filter((item) => requested.has(normalizeTitle(item.title))).sort((a, b) => (requested.get(normalizeTitle(a.title)) ?? 999) - (requested.get(normalizeTitle(b.title)) ?? 999)).map((item) => [item.id, item])).values())
}

export function getUpcoming(items: AnimeSummary[]): AnimeSummary[] {
  const now = new Date().getFullYear()
  return items.filter((item) => {
    const status = (item.status ?? "").toLowerCase()
    return /upcoming|announced|not yet aired|planned/.test(status) || (Boolean(item.year) && Number(item.year) > now && /movie|film|tv|ova|special/i.test(item.type ?? ""))
  }).slice(0, 24)
}
