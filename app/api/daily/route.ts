import { NextResponse } from 'next/server'

const GEMINI_MODEL = 'gemini-3.5-flash-lite'

type DailyContent = {
    topic: string
    fact: string
    paragraph: { text: string; keyTerm: string }
    story: { title: string; text: string; moral: string }
    quiz: { question: string; options: [string, string, string]; answerIndex: number }
}

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

async function generateDailyContent(body: {
    date: string
    topics?: string[]
    recentTopics?: string[]
}): Promise<NextResponse> {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: 'missing_key' }, { status: 503 })
    }

    const { date, topics = [], recentTopics = [] } = body

    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
    }

    const prompt = `Create one accurate, family-friendly daily learning page dated ${date}. Prefer these topics: ${topics.join(', ') || 'any curious subject'}. Avoid these recent topics: ${recentTopics.join(', ') || 'none'}.
Rules:
- fact: one surprising, accurate sentence
- paragraph.text: 120-160 words, clear and delightful
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

    const isDev = process.env.NODE_ENV !== 'production'

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': process.env.GEMINI_API_KEY,
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.85,
                        thinkingConfig: { thinkingLevel: 'low' },
                        responseSchema: {
                            type: 'OBJECT',
                            properties: {
                                topic: { type: 'STRING' },
                                quote: { type: 'OBJECT', properties: { text: { type: 'STRING' }, author: { type: 'STRING' } }, required: ['text', 'author'] },
                                word: { type: 'OBJECT', properties: { word: { type: 'STRING' }, partOfSpeech: { type: 'STRING' }, meaning: { type: 'STRING' }, example: { type: 'STRING' } }, required: ['word', 'partOfSpeech', 'meaning', 'example'] },
                                onThisDay: { type: 'OBJECT', properties: { year: { type: 'STRING' }, event: { type: 'STRING' } }, required: ['year', 'event'] },
                                challenge: { type: 'STRING' },
                                owlSays: { type: 'STRING' },
                                fact: { type: 'STRING' },
                                paragraph: {
                                    type: 'OBJECT',
                                    properties: {
                                        text: { type: 'STRING' },
                                        keyTerm: { type: 'STRING' },
                                    },
                                    required: ['text', 'keyTerm'],
                                },
                                story: {
                                    type: 'OBJECT',
                                    properties: {
                                        title: { type: 'STRING' },
                                        text: { type: 'STRING' },
                                        moral: { type: 'STRING' },
                                    },
                                    required: ['title', 'text', 'moral'],
                                },
                                quiz: {
                                    type: 'OBJECT',
                                    properties: {
                                        question: { type: 'STRING' },
                                        options: {
                                            type: 'ARRAY',
                                            items: { type: 'STRING' },
                                        },
                                        answerIndex: { type: 'INTEGER' },
                                    },
                                    required: ['question', 'options', 'answerIndex'],
                                },
                            },
                            required: ['topic', 'fact', 'paragraph', 'story', 'quiz'],
                        },
                    },
                }),
                signal: AbortSignal.timeout(80000),
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Gemini error:', response.status, errorText)
            return NextResponse.json(
                {
                    error: 'generation_failed',
                    ...(isDev && { upstreamStatus: response.status, details: errorText }),
                },
                { status: 502 }
            )
        }

        const result = await response.json()
        const raw = result.candidates?.[0]?.content?.parts?.[0]?.text

        if (typeof raw !== 'string') {
            console.error('Missing text in Gemini candidate:', JSON.stringify(result))
            return NextResponse.json(
                {
                    error: 'invalid_response',
                    ...(isDev && { details: result }),
                },
                { status: 502 }
            )
        }

        const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim())

        if (!isDailyContent(parsed)) {
            console.error('Schema validation failed:', parsed)
            return NextResponse.json(
                {
                    error: 'invalid_content',
                    ...(isDev && { received: parsed }),
                },
                { status: 502 }
            )
        }

        return NextResponse.json(parsed, {
            headers: { 'Cache-Control': 'no-store' },
        })
    } catch (err) {
        console.error('Daily route error:', err)
        return NextResponse.json(
            {
                error: 'generation_failed',
                ...(isDev && { details: err instanceof Error ? err.message : String(err) }),
            },
            { status: 502 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        return generateDailyContent(body)
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }
}

// Dev-only helper so you can hit the URL in a browser.
// Remove this before deploying to production.
export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
    }

    const date = new Date().toISOString().slice(0, 10)
    return generateDailyContent({ date, topics: [], recentTopics: [] })
}
