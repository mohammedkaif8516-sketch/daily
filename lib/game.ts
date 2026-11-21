// Gamification layer for Daily Delight. Everything lives in localStorage.
// To tune the game, change the numbers in XP, LEVELS and BADGES below.

export type DayGame = {
  visit?: boolean // read the page
  quiz?: boolean // answered the quiz (XP given)
  answer?: number // which option was picked
  right?: boolean // picked the correct option
  react?: boolean // stuck a reaction
  challenge?: boolean // finished the tiny challenge
  bonus?: boolean // finished the whole daily quest
}

export type ActionId = 'visit' | 'quiz' | 'react' | 'challenge' | 'bonus'

export type GameState = {
  xp: number
  badges: Record<string, string> // badge id -> date earned
  days: Record<string, DayGame>
}

export const XP = {
  visit: 10,
  quizRight: 15,
  quizTry: 5, // a wrong answer still earns a little, so trying never feels bad
  react: 5,
  challenge: 20,
  bonus: 15, // finishing the whole daily quest
} as const

export const LEVELS = [
  { xp: 0, title: 'Curious Kitten' },
  { xp: 40, title: 'Page Peeker' },
  { xp: 100, title: 'Fact Finder' },
  { xp: 180, title: 'Story Sniffer' },
  { xp: 280, title: 'Wonder Whisker' },
  { xp: 400, title: 'Almanac Ace' },
  { xp: 550, title: 'Paper Wizard' },
  { xp: 750, title: 'Grand Page-Turner' },
]

export function levelInfo(xp: number) {
  let index = 0
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) index = i
  const current = LEVELS[index]
  const next = LEVELS[index + 1]
  return {
    level: index + 1,
    title: current.title,
    nextTitle: next?.title ?? null,
    maxed: !next,
    toNext: next ? next.xp - xp : 0,
    pct: next ? Math.min(100, Math.floor(((xp - current.xp) / (next.xp - current.xp)) * 100)) : 100,
  }
}

export type Badge = { id: string; glyph: string; title: string; hint: string; color: string }

export const BADGES: Badge[] = [
  { id: 'first-page', glyph: '1', title: 'First Page', hint: 'Read your very first page', color: '#F6B91E' },
  { id: 'quiz-whiz', glyph: '?', title: 'Quiz Whiz', hint: 'Get a quiz answer right', color: '#4FB3E8' },
  { id: 'perfect-day', glyph: '★', title: 'Perfect Day', hint: 'Finish a whole daily quest', color: '#FF8FB1' },
  { id: 'streak-3', glyph: '3', title: 'Three in a Row', hint: 'Visit 3 days in a row', color: '#8CC63F' },
  { id: 'streak-7', glyph: '7', title: 'Lucky Week', hint: 'Visit 7 days in a row', color: '#E8452C' },
  { id: 'collector', glyph: '♥', title: 'Magpie', hint: 'Pin 3 things to the scrapbook', color: '#FF8FB1' },
  { id: 'explorer', glyph: '5', title: 'Explorer', hint: 'Learn about 5 different topics', color: '#4FB3E8' },
  { id: 'doer', glyph: '✓', title: 'Tiny Doer', hint: 'Finish 3 tiny challenges', color: '#8CC63F' },
]

export type BadgeContext = { streak: number; pins: number; topics: number; challenges: number }

export function earnedBadgeIds(game: GameState, ctx: BadgeContext): string[] {
  const days = Object.values(game.days)
  const ids: string[] = []
  if (days.some(d => d.visit)) ids.push('first-page')
  if (days.some(d => d.right)) ids.push('quiz-whiz')
  if (days.some(d => d.bonus)) ids.push('perfect-day')
  if (ctx.streak >= 3) ids.push('streak-3')
  if (ctx.streak >= 7) ids.push('streak-7')
  if (ctx.pins >= 3) ids.push('collector')
  if (ctx.topics >= 5) ids.push('explorer')
  if (ctx.challenges >= 3) ids.push('doer')
  return ids
}

// ---------- storage ----------

const KEY = 'daily-delight:game'

export const emptyGame = (): GameState => ({ xp: 0, badges: {}, days: {} })

export function readGame(): GameState {
  if (typeof window === 'undefined') return emptyGame()
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return emptyGame()
    const p = JSON.parse(raw)
    return {
      xp: typeof p.xp === 'number' ? p.xp : 0,
      badges: p.badges && typeof p.badges === 'object' ? p.badges : {},
      days: p.days && typeof p.days === 'object' ? p.days : {},
    }
  } catch {
    return emptyGame()
  }
}

export function writeGame(game: GameState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(game))
  } catch {
    /* Storage can be disabled or full. */
  }
}