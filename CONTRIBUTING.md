# Contributing

Thanks for helping improve Ponytai StreamAgain.

## Guidelines

- Keep changes small and focused.
- Do not commit stream keys, tokens, or `.env` files.
- Run `npm.cmd run check` before committing.
- When changing the agent, test at least one start or stop path.

## Project Structure

- `web/` contains the Cloudflare Pages frontend.
- `functions/` contains the Cloudflare Pages Functions API.
- `agent/` contains the Windows local FFmpeg agent.
- `scripts/` contains setup and validation scripts.
- `docs/` contains architecture notes.
