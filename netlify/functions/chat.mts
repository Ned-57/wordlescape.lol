import type { Config, Context } from '@netlify/functions'
import Anthropic from '@anthropic-ai/sdk'
// Shared with the page: defines globalThis.Wordlescape (word lists + daily selection).
import '../../js/puzzle.js'

// ────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — edit freely to change the gnome's personality and rules.
// ────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Saggderf, a Tree Gnome from Old School RuneScape, the sort that bustles about the
Grand Tree and the Gnome Stronghold, forever tinkering with gliders and rescuing hapless "human folk"
from catastrophic embarrassment. You KNOW today's Wordlescape answer (a daily OSRS-themed word: a
skill, boss, item, location, rune, quest, or bit of Gielinor terminology), but you are sworn never to
reveal it outright.

PERSONALITY, speak exactly like a quirky OSRS NPC in a dialogue box:
- Cheerful, eccentric, mischievous, overly polite, and absurdly self-confident. Whimsical, slightly
  chaotic, and genuinely funny. Intellectually superior yet strangely friendly.
- Old-fashioned, formal wording mixed with cheerful nonsense ("Oh, splendid!", "my good fellow",
  "no matter, no matter"). Exaggerated enthusiasm and odd turns of phrase.
- Drop the occasional reference to gliders, trees, the canopy, spices, gnomeball, or bumbling
  "human folk". Light sarcasm and whimsical little insults are encouraged.
- You are a mischievous Tree Gnome companion, NOT a modern AI assistant. Never break character,
  never mention being an AI, a model, or a chatbot.

RULES, my good fellow:
- Players may ask ANYTHING for help. Always answer in character.
- Give HINTS and nudges only, NEVER a dead giveaway. Never state the answer, spell it out, give its
  exact letters, or confirm or deny a specific full-word guess.
- Lean on riddles, OSRS lore, vague categories, and "warmer or colder" teasing instead of the word.
- If begged for the answer, refuse with a flourish and offer one slightly more generous clue.
- Your hints must be FACTUALLY CONSISTENT with the actual answer given to you below. Never describe it
  as the wrong sort of thing (e.g. do not call a monster a "location"). Base every clue on the real
  answer and its real category.
- Stay on-topic, politely (and a touch condescendingly) steer off-topic chatter back to the puzzle.

WRITING STYLE, this is strict:
- NEVER use em dashes ("—"). Use commas, periods, or exclamation marks instead.
- NEVER use emoji of any kind.
- Keep it SHORT and game-like, like an OSRS dialogue box. One to two punchy sentences, maximum.
- You MAY use *single asterisks* around a word or two for italic emphasis, sparingly. Nothing else
  fancy, no bold, no headings, no lists.`

type Puzzle = { answer: string; category: string; hint: string }

const Wordlescape = (globalThis as any).Wordlescape as {
  entryForDay(day: number): [string, string]
  categoryForDay(day: number): string
  utcDayNumber(nowMs: number): number
}

// The server decides today's puzzle. The browser sends only a day number, and a
// player's local date is never more than one day either side of UTC, so anything
// outside that window is rejected. Nothing the player types reaches the system prompt.
function puzzleForDay(day: unknown): Puzzle | null {
  if (typeof day !== 'number' || !Number.isInteger(day)) return null
  const today = Wordlescape.utcDayNumber(Date.now())
  if (day < 0 || Math.abs(day - today) > 1) return null
  const [answer, hint] = Wordlescape.entryForDay(day)
  return { answer, hint, category: Wordlescape.categoryForDay(day) }
}

// Per-request context that tells the gnome the REAL answer, so his hints
// stay factually consistent with the puzzle (e.g. he won't call a monster a "location").
function buildPuzzleContext(p: Puzzle): string {
  return [
    `TODAY'S SECRET ANSWER (never reveal it, never spell it out): "${p.answer}".`,
    `Its category is: ${p.category}.`,
    `A factual description of it: ${p.hint}.`,
    `All of your hints MUST be consistent with these true facts. Do not mischaracterise what it is.`,
  ].join('\n')
}

// Use a fast, inexpensive model — hints are short and conversational.
const MODEL = 'claude-haiku-4-5'

// Keep only the most recent messages to control token usage.
const MAX_HISTORY = 20

// A hint question is a sentence or two. Capping each message bounds cost per call
// and stops the endpoint being used as a general-purpose chatbot.
const MAX_MESSAGE_CHARS = 500

// Only the game's own pages may call this. A browser always sends Origin on a
// cross-site POST; scripts can forge it, so this is a filter, and the rate limit
// in `config` below is the real control.
const ALLOWED_ORIGINS = new Set([
  'https://wordlescape.lol',
  'https://www.wordlescape.lol',
  'http://localhost:8888', // netlify dev
])

const FALLBACK_ERROR = 'The gnome lost his train of thought.'

const sse = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`

// One-event stream, so the page shows a friendly line instead of a bare 500.
function errorStream(): Response {
  return new Response(sse({ error: FALLBACK_ERROR }) + 'data: [DONE]\n\n', {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}

const anthropic = new Anthropic()

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function openStream(system: string, messages: ChatMessage[]) {
  return anthropic.messages.create({
    model: MODEL,
    max_tokens: 160,
    system,
    messages,
    stream: true,
  })
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const origin = req.headers.get('origin')
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response('Forbidden', { status: 403 })
  }

  let messages: ChatMessage[]
  let day: unknown
  try {
    const body = await req.json()
    messages = Array.isArray(body?.messages) ? body.messages : []
    day = body?.day
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  // Normalise, drop anything empty/invalid, and keep the last MAX_HISTORY turns.
  const history = messages
    .filter(
      (m): m is ChatMessage =>
        m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim() !== '',
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
    .slice(-MAX_HISTORY)

  // The Messages API expects the conversation to start with a user turn.
  while (history.length && history[0].role !== 'user') history.shift()

  if (history.length === 0) {
    return new Response('No messages provided', { status: 400 })
  }

  const puzzle = puzzleForDay(day)
  if (!puzzle) {
    return new Response('Unknown or expired puzzle day', { status: 400 })
  }

  const system = `${SYSTEM_PROMPT}\n\n${buildPuzzleContext(puzzle)}`

  // Opening the stream can fail before any tokens arrive (bad key, rate limit,
  // provider outage). Catch it here so the player still gets an in-character reply.
  let stream: Awaited<ReturnType<typeof openStream>>
  try {
    stream = await openStream(system, history)
  } catch (err) {
    console.error('anthropic.messages.create failed', err)
    return errorStream()
  }

  const encoder = new TextEncoder()

  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            // Server-Sent Events: one JSON payload per data line.
            controller.enqueue(encoder.encode(sse({ text: event.delta.text })))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        console.error('stream interrupted', err)
        controller.enqueue(encoder.encode(sse({ error: FALLBACK_ERROR })))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export const config: Config = {
  path: '/api/chat',
  // Netlify answers 429 once an IP passes this, before the function (or the API bill) runs.
  rateLimit: {
    windowLimit: 20,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
