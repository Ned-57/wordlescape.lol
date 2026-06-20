import type { Context } from '@netlify/functions'
import Anthropic from '@anthropic-ai/sdk'

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

// Build the per-request context that tells the gnome the REAL answer, so his hints
// stay factually consistent with the puzzle (e.g. he won't call a monster a "location").
function buildPuzzleContext(puzzle: unknown): string {
  if (!puzzle || typeof puzzle !== 'object') return ''
  const p = puzzle as { answer?: unknown; category?: unknown; hint?: unknown }
  const answer = typeof p.answer === 'string' ? p.answer.trim() : ''
  if (!answer) return ''
  const category = typeof p.category === 'string' ? p.category.trim() : ''
  const hint = typeof p.hint === 'string' ? p.hint.trim() : ''

  return [
    `TODAY'S SECRET ANSWER (never reveal it, never spell it out): "${answer}".`,
    category ? `Its category is: ${category}.` : '',
    hint ? `A factual description of it: ${hint}.` : '',
    `All of your hints MUST be consistent with these true facts. Do not mischaracterise what it is.`,
  ]
    .filter(Boolean)
    .join('\n')
}

// Use a fast, inexpensive model — hints are short and conversational.
const MODEL = 'claude-haiku-4-5'

// Keep only the most recent messages to control token usage.
const MAX_HISTORY = 20

const anthropic = new Anthropic()

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let messages: ChatMessage[]
  let puzzle: unknown
  try {
    const body = await req.json()
    messages = Array.isArray(body?.messages) ? body.messages : []
    puzzle = body?.puzzle
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  // Normalise, drop anything empty/invalid, and keep the last MAX_HISTORY turns.
  const history = messages
    .filter(
      (m): m is ChatMessage =>
        m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim() !== '',
    )
    .map((m) => ({ role: m.role, content: m.content }))
    .slice(-MAX_HISTORY)

  if (history.length === 0) {
    return new Response('No messages provided', { status: 400 })
  }

  const puzzleContext = buildPuzzleContext(puzzle)
  const system = puzzleContext ? `${SYSTEM_PROMPT}\n\n${puzzleContext}` : SYSTEM_PROMPT

  const stream = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 160,
    system,
    messages: history,
    stream: true,
  })

  const encoder = new TextEncoder()

  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            // Server-Sent Events: one JSON payload per data line.
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'The gnome lost his train of thought.' })}\n\n`),
        )
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

export const config = {
  path: '/api/chat',
}
