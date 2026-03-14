# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Memory Reliver — a hackathon project that lets users upload photos, talk to a voice agent about their memories, and explore them as 3D Gaussian splat worlds. Built for Worlds in Action Hack SF 2026.

## Commands

```bash
pnpm dev              # Next.js frontend (Turbopack) on http://localhost:3000
pnpm agent:dev        # LiveKit voice agent (run in separate terminal)
pnpm mcp:start        # MCP server (stdio transport, for Claude Desktop)
pnpm build            # Production build
```

Both `pnpm dev` and `pnpm agent:dev` must be running simultaneously for the full experience.

## Environment

Copy `.env.local.example` to `.env.local`. Required keys: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `OPENAI_API_KEY`, `MARBLE_API_KEY`, `DEEPGRAM_API_KEY`.

## Architecture

Three independent runtimes share `data/photos.json` as the photo store:

1. **Next.js app** (`src/`) — React 19 frontend + API routes. Uses `@/*` path alias for `./src/*`. Excluded from tsconfig: `agent/` and `mcp-server/`.

2. **LiveKit voice agent** (`agent/`) — Separate Node process with its own `tsconfig.json`. Uses Silero VAD → Deepgram STT → GPT-4o → OpenAI TTS. The `MemoryAgent` class (`agent/memory-agent.ts`) defines LLM tools (`search_memories`, `generate_world`, `check_world_status`) that read photos from disk and call the Marble API directly.

3. **MCP server** (`mcp-server/index.ts`) — Standalone stdio-based MCP server using `@modelcontextprotocol/sdk`. Exposes `search_memories`, `list_all_memories`, `get_memory_details`, `generate_marble_world` tools. The `generate_marble_world` tool polls synchronously (up to 5 minutes) before returning.

### Data flow

- Photos uploaded via `/api/upload-photos` → saved to `public/uploads/`, metadata with EXIF dates written to `data/photos.json`
- Agent and MCP server read `data/photos.json` directly from disk (not via API)
- 3D worlds generated via World Labs Marble API (`api.worldlabs.ai/marble/v1`), model `Marble 0.1-mini`
- WorldViewer renders either via iframe (Marble URL) or SparkJS `SplatMesh` (Gaussian splat `.spz` files) with Three.js

### Key libraries

- `@livekit/agents` + plugins for voice pipeline
- `@sparkjsdev/spark` for Gaussian splat rendering
- `@react-three/fiber` + `@react-three/drei` for Three.js React bindings
- `exifr` for EXIF date extraction from uploaded photos
- `livekit-server-sdk` for generating access tokens in `/api/connection-details`

### API routes

- `GET /api/photos` — list all or search (`?q=`) or get by ID (`?id=`)
- `POST /api/upload-photos` — multipart form upload with EXIF extraction
- `POST /api/generate-world` — starts Marble generation and polls until complete
- `GET /api/connection-details` — creates LiveKit room + access token

### Photo search

Search logic is duplicated in three places (`src/lib/photo-store.ts`, `agent/memory-agent.ts`, `mcp-server/index.ts`). Each implements date-based (year/month/day) and text-based matching independently.
