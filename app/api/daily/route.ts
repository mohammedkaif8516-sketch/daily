import { NextResponse } from 'next/server'
import { mkdir, writeFile, appendFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'

export const runtime = 'nodejs'
export const maxDuration = 180

const LOG_DIR = path.join(process.cwd(), 'data', 'responses')
const CONFIG_PATH = path.join(process.cwd(), 'config', 'providers.yaml')

type ProviderConfig = {
    name: string
    enabled?: boolean
    type: 'gemini' | 'openai'
    model: string
    apiKeyEnv: string
    baseUrl?: string
    timeoutSeconds?: number
    jsonMode?: boolean
    retryOn503?: boolean
    thinkingLevel?: string
}

type DailyContent = {
    topic: string
    fact: string
    paragraph: { text: string; keyTerm: string }
    story: { title: string; text: string; moral: string }
    quiz: { question: string; options: [string, string, string]; answerIndex: number }
    quote?: { text: string; author: string }
    word?: { word: string; partOfSpeech: string; meaning: string; example: string }
    onThisDay?: { year: string; event: string }
    challenge?: string
    owlSays?: string
}

// ---------- config ----------

const DEFAULT_CONFIG: ProviderConfig[] = [
  { name: 'gemini', enabled: true, type: 'gemini', model: 'gemini-3.1-flash-lite', apiKeyEnv: 'GEMINI_API_KEY', timeoutSeconds: 40, retryOn503: true },
]

async function loadProviderConfig(): Promise<ProviderConfig[]> {
    try {
        const text = await readFile(CONFIG_PATH, 'utf8')
        const parsed = parseYaml(text) as { providers?: ProviderConfig[] } | null
        if (!parsed?.providers || !Array.isArray(parsed.providers)) throw new Error('"providers" list is missing')
        return parsed.providers
    } catch (err) {
        console.error('[daily] could not read config/providers.yaml, using Gemini only:', err instanceof Error ? err.message : err)
        return DEFAULT_CONFIG
    }
}

function resolveChatUrl(base: string): string {
    const url = base.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '')
    return /\/chat\/completions$/.test(url) ? url : `${url}/chat/completions`
}

// ---------- validation ----------

function isDailyContent(value: unknown): value is DailyContent {
    if (!value || typeof value !== 'object') return false
    const v = value as Record<string, any>
    return (
        typeof v.topic === 'string' &&
        typeof v.fact === 'string' &&
        typeof v.paragraph?.text === 'string' &&
        typeof v.paragraph?.keyTerm === 'string' &&
        typeof v.story?.title === 'string' &&
        typeof v.story?.text === 'string' &&
        typeof v.story?.moral === 'string' &&
        typeof v.quiz?.question === 'string' &&
        Array.isArray(v.quiz?.options) &&
        v.quiz.options.length === 3 &&
        v.quiz.options.every((item: unknown) => typeof item === 'string') &&
        Number.isInteger(v.quiz.answerIndex) &&
        v.quiz.answerIndex >= 0 &&
        v.quiz.answerIndex < 3
    )
}

function cleanOptional(content: DailyContent): DailyContent {
    const v = content as Record<string, any>
    if (!(typeof v.quote?.text === 'string' && typeof v.quote?.author === 'string')) delete v.quote
    if (
        !(
            typeof v.word?.word === 'string' &&
            typeof v.word?.meaning === 'string' &&
            typeof v.word?.partOfSpeech === 'string' &&
            typeof v.word?.example === 'string'
        )
    ) delete v.word
    if (!(typeof v.onThisDay?.year === 'string' && typeof v.onThisDay?.event === 'string')) delete v.onThisDay
    if (typeof v.challenge !== 'string') delete v.challenge
    if (typeof v.owlSays !== 'string') delete v.owlSays
    return v as DailyContent
}

// ---------- prompt + schema ----------

function buildPrompt(date: string, topics: string[], recentTopics: string[]) {
    return `Create one accurate, family-friendly daily learning page dated ${date}. Prefer these topics: ${topics.join(', ') || 'any curious subject'}. Avoid these recent topics: ${recentTopics.join(', ') || 'none'}.

Return ONLY a JSON object with exactly this shape:
{"topic":"","fact":"","paragraph":{"text":"","keyTerm":""},"story":{"title":"","text":"","moral":""},"quiz":{"question":"","options":["","",""],"answerIndex":0},"quote":{"text":"","author":""},"word":{"word":"","partOfSpeech":"","meaning":"","example":""},"onThisDay":{"year":"","event":""},"challenge":"","owlSays":""}

Rules:
- fact: one surprising, accurate sentence
- paragraph.text: 120-160 words, clear and delightful, proofread for grammar
- paragraph.keyTerm: one exact phrase copied from paragraph.text
- story.title: short title
- story.text: original gentle story, 200-300 words
- story.moral: one warm sentence
- quiz.question: one question about the fact
- quiz.options: exactly 3 distinct choices
- quiz.answerIndex: 0, 1, or 2 matching the correct option in quiz.options
- quote.text: one short uplifting or curious quote under 25 words; quote.author: the real person who said it, or "Pip" if you wrote it yourself. Never attribute an invented quote to a real person
- word.word: one interesting English word related to the topic; word.partOfSpeech; word.meaning: one plain sentence; word.example: one short example sentence
- onThisDay.year: a year as text; onThisDay.event: one kid-friendly, true sentence about something that happened on this month and day (${date}). Omit onThisDay if you are not certain it is true
- challenge: one tiny, safe, 5-minute offline activity inspired by today's topic
- owlSays: a cheerful remark from Pip the owl about today's fact, under 12 words`
}

const geminiSchema = {
    type: 'OBJECT',
    properties: {
        topic: { type: 'STRING' },
        fact: { type: 'STRING' },
        paragraph: {
            type: 'OBJECT',
            properties: { text: { type: 'STRING' }, keyTerm: { type: 'STRING' } },
            required: ['text', 'keyTerm'],
        },
        story: {
            type: 'OBJECT',
            properties: { title: { type: 'STRING' }, text: { type: 'STRING' }, moral: { type: 'STRING' } },
            required: ['title', 'text', 'moral'],
        },
        quiz: {
            type: 'OBJECT',
            properties: {
                question: { type: 'STRING' },
                options: { type: 'ARRAY', items: { type: 'STRING' } },
                answerIndex: { type: 'INTEGER' },
            },
            required: ['question', 'options', 'answerIndex'],
        },
        quote: {
            type: 'OBJECT',
            properties: { text: { type: 'STRING' }, author: { type: 'STRING' } },
            required: ['text', 'author'],
        },
        word: {
            type: 'OBJECT',
            properties: {
                word: { type: 'STRING' },
                partOfSpeech: { type: 'STRING' },
                meaning: { type: 'STRING' },
                example: { type: 'STRING' },
            },
            required: ['word', 'partOfSpeech', 'meaning', 'example'],
        },
        onThisDay: {
            type: 'OBJECT',
            properties: { year: { type: 'STRING' }, event: { type: 'STRING' } },
            required: ['year', 'event'],
        },
        challenge: { type: 'STRING' },
        owlSays: { type: 'STRING' },
    },
    required: ['topic', 'fact', 'paragraph', 'story', 'quiz', 'quote', 'word', 'challenge', 'owlSays'],
}

// ---------- provider calls ----------

async function callGemini(cfg: ProviderConfig, apiKey: string, prompt: string): Promise<string> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.85,
                    responseSchema: geminiSchema,
                    ...(cfg.thinkingLevel ? { thinkingConfig: { thinkingLevel: cfg.thinkingLevel } } : {}),
                },
            }),
            signal: AbortSignal.timeout((cfg.timeoutSeconds ?? 60) * 1000),
        }
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 400)}`)
    const result = await response.json()
    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof raw !== 'string') throw new Error('no text in response')
    return raw
}

async function callOpenAICompatible(cfg: ProviderConfig, apiKey: string, prompt: string): Promise<string> {
    if (!cfg.baseUrl) throw new Error('baseUrl is missing in providers.yaml')
    const response = await fetch(resolveChatUrl(cfg.baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: cfg.model,
            temperature: 0.85,
            ...(cfg.jsonMode ? { response_format: { type: 'json_object' } } : {}),
            messages: [
                {
                    role: 'system',
                    content:
                        'You write family-friendly daily learning pages. Reply with ONLY one valid JSON object. No markdown, no code fences, no commentary.',
                },
                { role: 'user', content: prompt },
            ],
        }),
        signal: AbortSignal.timeout((cfg.timeoutSeconds ?? 60) * 1000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 400)}`)
    const result = await response.json()
    const raw = result.choices?.[0]?.message?.content
    if (typeof raw !== 'string' || !raw.trim()) throw new Error('empty text in response')
    return raw
}

async function callProvider(cfg: ProviderConfig, apiKey: string, prompt: string): Promise<string> {
    const run = () => (cfg.type === 'gemini' ? callGemini(cfg, apiKey, prompt) : callOpenAICompatible(cfg, apiKey, prompt))
    try {
        return await run()
    } catch (err) {
        if (cfg.retryOn503 && String(err).includes('HTTP 503')) {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return run()
        }
        throw err
    }
}

// ---------- helpers ----------

function parseJson(raw: string): unknown {
    const stripped = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    const start = stripped.indexOf('{')
    const end = stripped.lastIndexOf('}')
    return JSON.parse(start >= 0 && end > start ? stripped.slice(start, end + 1) : stripped)
}

async function saveToFile(kind: 'ok' | 'fail', date: string, provider: string, payload: unknown) {
    if (process.env.NODE_ENV === 'production') return // Vercel's filesystem is read-only
    try {
        await mkdir(LOG_DIR, { recursive: true })
        const stamp = new Date().toISOString().replace(/[:.]/g, '-')
        const record = { savedAt: new Date().toISOString(), date, provider, payload }
        await writeFile(path.join(LOG_DIR, `${stamp}_${kind}_${provider}.json`), JSON.stringify(record, null, 2), 'utf8')
        await appendFile(path.join(LOG_DIR, 'all.jsonl'), JSON.stringify(record) + '\n', 'utf8')
    } catch (err) {
        console.error('[daily] could not write response file:', err)
    }
}

// ---------- main ----------

async function generateDailyContent(body: {
    date: string
    topics?: string[]
    recentTopics?: string[]
}): Promise<NextResponse> {
    const { date, topics = [], recentTopics = [] } = body

    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
    }

    const prompt = buildPrompt(date, topics, recentTopics)
    const isDev = process.env.NODE_ENV !== 'production'
    const config = await loadProviderConfig()

    const active: { cfg: ProviderConfig; apiKey: string }[] = []
    for (const cfg of config) {
        if (cfg.enabled === false) continue
        const apiKey = process.env[cfg.apiKeyEnv]
        if (!apiKey) {
            console.warn(`[daily] skipping ${cfg.name}: ${cfg.apiKeyEnv} is not set in .env.local`)
            continue
        }
        active.push({ cfg, apiKey })
    }

    console.log('[daily] providers active:', active.map(p => `${p.cfg.name} (${p.cfg.model})`).join(' -> ') || 'none')

    if (active.length === 0) {
        return NextResponse.json({ error: 'missing_key' }, { status: 503 })
    }

    const errors: string[] = []

    for (const { cfg, apiKey } of active) {
        try {
            const raw = await callProvider(cfg, apiKey, prompt)
            const parsed = parseJson(raw)
            if (!isDailyContent(parsed)) throw new Error('response did not match the expected shape')
            const cleaned = cleanOptional(parsed)
            console.log(`[daily] served by ${cfg.name}`)
            await saveToFile('ok', date, cfg.name, { cleaned, raw })
            return NextResponse.json(cleaned, {
                headers: { 'Cache-Control': 'no-store', 'X-Provider': cfg.name },
            })
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            console.error(`[daily] ${cfg.name} failed:`, message)
            errors.push(`${cfg.name}: ${message}`)
            await saveToFile('fail', date, cfg.name, { error: message })
        }
    }

    return NextResponse.json(
        { error: 'generation_failed', ...(isDev && { details: errors }) },
        { status: 502 }
    )
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        return generateDailyContent(body)
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }
}

// Dev-only helper so you can hit the URL in a browser. Remove before deploying.
export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
    }
    const date = new Date().toISOString().slice(0, 10)
    return generateDailyContent({ date, topics: [], recentTopics: [] })
}