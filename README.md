# SalesFlow

A sales outreach app for companies, leads, and multi-step sequences.

## Features

- Company kanban. A company page lists that company's leads and activity.
- Lead list, lead pipeline, and a lead page with contact fields, stage, and an activity timeline.
- Sequence builder that stores multi-step templates. Channels are email, voice drop, cold call, LinkedIn connect, LinkedIn message, LinkedIn engage, and social post.
- Cold and follow-up email drafts on the lead page. Drafts are written with the Anthropic API and saved on the lead.
- `POST /api/ai/generate-content` drafts voice drops, cold-call scripts, LinkedIn copy, and social posts for a lead.
- Sales assistant chat for outreach questions. A conversation includes a lead, company, or sequence when it is created with that context. The sidebar chat opens a general conversation.

## Tech stack

- Frontend: React 19, Vite 7, Axios
- Backend: Node.js, Express, PostgreSQL (`pg`)
- Message drafting and chat: Anthropic Messages API, model `claude-sonnet-4-5`

## Getting started

1. Copy the environment file and set `DATABASE_URL` and `ANTHROPIC_API_KEY`:
   ```bash
   cp .env.example .env
   ```
2. Apply `backend/db/migration.sql`, then `backend/db/migration-v2.sql`, in the database.
3. Start the API on port 3001. When `pipeline_stages` is empty, startup loads demo stages, companies, leads, and sequences.
   ```bash
   cd backend && npm install && npm start
   ```
4. Start the frontend on port 3000. Requests to `/api` are proxied to port 3001.
   ```bash
   cd frontend && npm install && npm run dev
   ```

When `frontend/dist` exists, the API serves that build as well.
