# Wordlescape

**A daily Old School RuneScape word puzzle with an in-character AI hint assistant.**

[**Play it at wordlescape.lol**](https://wordlescape.lol)

<p align="left">
  <img src="icons/gnome.png" alt="Saggderf the gnome" width="72">
</p>

Every day there is one new OSRS word to guess in six tries: a skill, a rune, a city, a monster, a Slayer master or a quest. If you are stuck, you can ask **Saggderf**, a Tree Gnome who knows the answer and will not say it. He gives you riddles and nudges instead, in the voice of an OSRS dialogue box.

Saggderf runs on Anthropic's Claude through the Messages API, with replies streamed to the browser as they are written.

---

## At a glance

| | |
|---|---|
| **Front end** | A single static page in plain HTML, CSS and JavaScript. No framework, no build step. |
| **Back end** | One serverless function, written in TypeScript on Netlify Functions |
| **AI** | Anthropic SDK (`@anthropic-ai/sdk`), `claude-haiku-4-5`, streamed over Server-Sent Events |
| **State** | Streaks and statistics live in the player's `localStorage`. There is no database and no account. |
| **Hosting** | Netlify, at [wordlescape.lol](https://wordlescape.lol) |

---

## How the hint assistant works

```
Browser                         Netlify Function  /api/chat               Anthropic
───────                         ──────────────────────────               ─────────
POST { messages, day }  ──────▶ rate limit (20 requests per minute per IP)
                                check Origin, method and JSON body
                                look up the day's puzzle on the server
                                trim history to 20 turns, 500 chars each
                                system prompt + puzzle facts  ──────────▶ messages.create
                                                                           (stream: true)
text arrives as it is  ◀─────── re-emit each text delta as SSE ◀───────── text_delta events
written
```

**Grounded on the real answer.** Each request adds the day's answer, its category and a factual description to the system prompt. That stops the model inventing clues that do not fit, such as calling a monster a location.

**The server decides the puzzle.** The browser sends only a day number. The function works out the puzzle itself from `js/puzzle.js`, the same code the page uses, so the page and the server always agree. It only accepts a day within one day of UTC, which covers every time zone. Nothing a player types is ever placed in the system prompt.

**It never gives the answer away.** The system prompt forbids revealing, spelling out or confirming the answer, and has Saggderf answer a direct request with one slightly better clue instead.

**It stays in character, and stays short.** Replies are one or two sentences. Saggderf never mentions being an AI, uses no emoji and no em dashes, and steers off-topic chat back to the puzzle.

**Cost is kept down.** Each request uses a small, fast model with `max_tokens: 160`, keeps only the last 20 messages and cuts each message to 500 characters.

**Failure is handled.** If Anthropic cannot be reached before the stream starts (a bad key, a rate limit or an outage), or the stream breaks partway, the player still gets an in-character message. The real error goes to the function log. If a player is rate limited, the page shows its own in-character message.

**Abuse is limited.** Netlify's code-based rate limiting turns away excessive requests with a 429 before the function runs, so before any API spend. A check on the Origin header also filters casual calls from other sites.

---

## Design notes

- **Daily selection is deterministic.** The word comes from the day number and a fixed-seed shuffle, so every player gets the same puzzle with no server round trip.
- **The answer is not secret from the browser, by design.** As in any client-side Wordle, the word list ships with the page. The server lookup above is there to keep player input out of the system prompt and to stop the endpoint being used as a free chatbot. It does not hide the answer.
- **Shared code.** `js/puzzle.js` sets a single global and has no exports. That makes it valid both as a classic browser script and as a module the function can import.

---

## Project structure

```
index.html                    The game: layout, styles, game logic and chat UI
js/puzzle.js                  Word lists and daily selection, shared by the page and the function
netlify/functions/chat.mts    The /api/chat hint endpoint (Anthropic SDK, SSE streaming)
icons/                        Category hint artwork
```

---

## Running it locally

Requires Node 18 or later and the [Netlify CLI](https://docs.netlify.com/cli/get-started/).

```powershell
npm install
$env:ANTHROPIC_API_KEY = "sk-ant-..."
netlify dev
```

Then open <http://localhost:8888>. The game itself works from any static file server. Only the hint assistant needs the function and an API key.

---

## Author

Built by **Ned Telfer**, backend software engineer.
[nedtelfer.com](https://nedtelfer.com) · [GitHub](https://github.com/Ned-57)

*Old School RuneScape is a trademark of Jagex Ltd. This is an unofficial fan project and is not affiliated with Jagex.*
