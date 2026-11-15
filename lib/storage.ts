export type DailyContent = {
  topic: string; fact: string; paragraph: { text: string; keyTerm: string }
  story: { title: string; text: string; moral: string }
    quiz: { question: string; options: [string, string, string]; answerIndex: number }
  quote?: { text: string; author: string }
  word?: { word: string; partOfSpeech: string; meaning: string; example: string }
  onThisDay?: { year: string; event: string }
  challenge?: string
  owlSays?: string
}
export type SavedDay = { content: DailyContent; reaction?: string; torn?: boolean; challengeDone?: boolean }
const safeRead = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}
const safeWrite = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* Storage can be disabled or full. */ }
}
export const readDay = (date: string) => safeRead<SavedDay | null>(`daily-delight:${date}`, null)
export const writeDay = (date: string, day: SavedDay) => safeWrite(`daily-delight:${date}`, day)
export const readFavorites = () => safeRead<{ id: string; date: string; kind: string; title: string; text: string }[]>('daily-delight:favorites', [])
export const writeFavorites = (items: ReturnType<typeof readFavorites>) => safeWrite('daily-delight:favorites', items)
export const readPrefs = () => safeRead<{ topics: string[]; lastVisit?: string; streak?: number }>('daily-delight:prefs', { topics: [] })
export const writePrefs = (prefs: ReturnType<typeof readPrefs>) => safeWrite('daily-delight:prefs', prefs)
