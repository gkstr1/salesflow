# SalesFlow

A multi-channel sales outreach platform.

## Features

- Company board with each company's leads nested inside
- Lead list and detail pages with an activity timeline
- Sequence builder for multi-step outreach
- Drafted content for email, LinkedIn (connect, engage, message) and voice drops
- Sales assistant chat that knows the selected lead and company

## Tech stack

- Frontend: React 19, Vite 7, Axios
- Backend: Node.js, Express, PostgreSQL (pg), Anthropic API

## Getting started

1. Copy the environment file and fill in `DATABASE_URL` and `ANTHROPIC_API_KEY`:
   ```bash
   cp .env.example .env
   ```
2. Create the database tables by running `backend/db/migration.sql`, then `backend/db/migration-v2.sql`.
3. Start the backend (port 3001). Demo pipeline stages and sample data load on first start.
   ```bash
   cd backend && npm install && npm start
   ```
4. Start the frontend:
   ```bash
   cd frontend && npm install && npm run dev
   ```
