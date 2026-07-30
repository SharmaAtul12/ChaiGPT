# ChaiGPT

ChaiGPT is a modern AI chat application built with Next.js, Clerk, Prisma, PostgreSQL, and the Vercel AI SDK. It provides authenticated chat sessions, streaming assistant responses, persistent conversation history, sidebar conversation management, and a clean chat UI.

## Overview

The app is organized around authenticated chat conversations:

- Users sign in through Clerk.
- Onboarding syncs the Clerk profile into the local `User` table.
- The home route creates a new conversation and redirects to `/c/[id]`.
- Messages stream through `/api/chat` and are persisted with Prisma.
- The sidebar lets users rename, pin, and delete chats.

## Tech Stack

- Next.js App Router
- React 19
- TypeScript
- Clerk authentication
- Prisma ORM
- PostgreSQL
- Vercel AI SDK
- TanStack Query
- Tailwind CSS 4
- shadcn/ui and Base UI primitives

## Project Flows

### 1) Authentication and onboarding flow

This flow protects the app, signs the user in with Clerk, and ensures the user exists in the local database before any chat action is allowed.

```mermaid
flowchart TD
	A["Open app"] --> B{"Authenticated?"}
	B -- No --> C["Redirect to Clerk sign-in"]
	B -- Yes --> D["Auth layout and root layout"]
	D --> E["onBoard syncs Clerk user to Prisma User"]
	E --> F["ChatShell renders protected app"]
	F --> G["User can create or open chats"]
```

### 2) New chat creation flow

The root page creates a new conversation on load and redirects to the new conversation route.

```mermaid
flowchart TD
	A["Visit home route"] --> B["startNewChat"]
	B --> C["requireUser"]
	C --> D["Create Conversation row"]
	D --> E["Redirect to conversation page"]
```

### 3) Open conversation and load history flow

When a conversation route is opened, the app validates ownership and loads stored messages before the client chat view mounts.

```mermaid
flowchart TD
	A["Open conversation page"] --> B["getConversation"]
	B --> C{"Owned by current user?"}
	C -- No --> D["Not Found"]
	C -- Yes --> E["loadChatMessages"]
	E --> F["ConversationView mounts"]
	F --> G["Hydrated chat history shown"]
```

### 4) Send message and stream assistant response flow

This is the main chat loop. The UI sends the latest message to the API, the backend streams the AI response, and the final message set is saved back to the database.

```mermaid
sequenceDiagram
	autonumber
	participant U as User
	participant UI as Conversation View
	participant API as Chat API
	participant DB as Prisma and PostgreSQL
	participant AI as AI SDK and OpenAI

	U->>UI: Type message and send
	UI->>API: id + latest UIMessage
	API->>DB: Verify conversation ownership
	API->>DB: Load previous messages
	API->>DB: Save new user message if needed
	API->>AI: streamText(model, systemPrompt, messages)
	AI-->>UI: Stream assistant tokens
	API->>DB: Save final messages on stream end
	API-->>UI: Streaming response completes
```

### 5) Sidebar conversation management flow

The sidebar lists the user’s non-archived chats and provides rename, pin, and delete actions.

```mermaid
flowchart TD
	A["Sidebar loads conversations"] --> B["listConversations"]
	B --> C["Render active chat list"]
	C --> D["Rename chat"]
	C --> E["Pin or unpin chat"]
	C --> F["Delete chat"]
	D --> G["updateConversation"]
	E --> G
	F --> H["deleteConversation"]
	G --> I["Revalidate and refresh sidebar"]
	H --> I
```

### 6) Theme and account flow

The shell also exposes a theme toggle and Clerk account button in the sidebar footer.

```mermaid
flowchart TD
	A["Open sidebar footer"] --> B["Toggle theme"]
	A --> C["Clerk UserButton"]
	B --> D["Theme provider updates appearance"]
	C --> E["Manage account or sign out"]
```

## Flow Diagrams from Notes

The following reference diagrams are stored in the `Notes` folder and embedded here for quick access.

### AI Frontend Flow

![AI Frontend flow diagram](Notes/AI-Frontend.png)

### AI Backend Flow

![AI Backend flow diagram](Notes/AI-Backend.png)

## Setup Dependencies

### Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL database
- Clerk application keys
- OpenAI-compatible API key

### Install project dependencies

```bash
npm install
```

### Environment variables

Create a `.env.local` file and provide the values required by your deployment:

```bash
DATABASE_URL="postgresql://..."
CLERK_SECRET_KEY="..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."
OPENAI_API_KEY="..."
```

### Prisma setup

```bash
npx prisma generate
npx prisma migrate dev
```

## Run the app

```bash
npm run dev
```

Open the app at `http://localhost:3000`.

## Available Scripts

- `npm run dev` starts the local development server.
- `npm run build` creates a production build.
- `npm run start` starts the production server.
- `npm run lint` runs ESLint.

## Key Features

- Clerk-authenticated access to the app.
- Automatic user onboarding into the database.
- New chat creation with redirect to a conversation route.
- Streaming assistant responses through the AI SDK.
- Persistent conversations and messages in PostgreSQL.
- Sidebar conversation management with rename, pin, and delete actions.
- Message history hydration when reopening a chat.
- Theme toggling and Clerk account controls in the shell.

## Data Model

The Prisma schema centers on three entities:

- `User` stores Clerk identity and profile data.
- `Conversation` stores chat metadata such as title, pin state, archive state, and model override.
- `Message` stores chat content, role, status, and structured AI parts.

## Folder Structure

This project follows a production-ready feature-based structure. Keep UI concerns in the frontend layer, server and persistence concerns in the backend layer, and shared utilities in dedicated cross-cutting folders.

### 1. Frontend Folder Structure

```text
app/
	globals.css
	layout.tsx
	(auth)/
		layout.tsx
		sign-in/
		sign-up/
	(root)/
		layout.tsx
		page.tsx
		c/
			[id]/
components/
	ai-elements/
	providers/
	ui/
features/
	conversation/
		components/
		hooks/
		utils/
	home/
		actions/
		hooks/
	messages/
		actions/
		hooks/
hooks/
	use-mobile.ts
public/
Notes/
```

Frontend maintenance rules:

- Keep route composition in `app/` and avoid putting feature logic directly in pages when a reusable feature module already exists.
- Put chat UI, sidebar UI, and message rendering inside `features/conversation/components/`.
- Put reusable visual primitives in `components/ui/` and AI-specific presentation components in `components/ai-elements/`.
- Put client-side data hooks in `features/*/hooks/` so the UI layer stays thin.
- Keep global styles, theme wiring, and providers centralized instead of duplicating them across pages.

### 2. Backend Folder Structure

```text
features/
	auth/
		actions/
		hooks/
	ai/
		actions/
		utils/
	conversation/
		actions/
		utils/
	home/
		actions/
	messages/
		actions/
lib/
	db.ts
	utils.ts
	generated/
		prisma/
prisma/
	schema.prisma
	migrations/
app/
	api/
		chat/
			route.ts
```

Backend maintenance rules:

- Keep all server-only logic in server actions, route handlers, or backend utilities under `features/*/actions/` and `features/*/utils/`.
- Keep database access behind `lib/db.ts` and Prisma models; do not scatter raw queries through UI components.
- Treat `app/api/chat/route.ts` as the only streaming chat entrypoint unless a new API route is intentionally added.
- Keep schema changes in `prisma/schema.prisma` and migrations in `prisma/migrations/`.
- Keep AI model selection, message storage, and conversation ownership checks on the server side.
- When adding a new backend capability, create a feature folder first, then add actions, hooks, or utilities inside that feature instead of expanding unrelated modules.

### Structure Principles

- Feature code should be colocated with the domain it serves.
- UI should call hooks and actions, not database code directly.
- Server actions should validate ownership and input before touching persistence.
- Shared helpers should stay small, explicit, and reusable.
- New files should follow the same naming style as the existing codebase.

## Important Routes

- `/` creates a new conversation and redirects to it.
- `/c/[id]` renders a specific conversation.
- `/api/chat` streams AI responses for the active conversation.

## Notes

- Conversations are owned by the signed-in user and are validated on the server before reads or writes.
- The first user message can auto-title a chat when the conversation is still named `New Chat`.
- Message persistence is idempotent so duplicate UI messages are not stored twice.

## Deployment

### Deploy on Vercel

Vercel is the recommended deployment target for this project.

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. Import the repository into Vercel and let it detect the Next.js app.
3. Add the required environment variables in the Vercel project settings:

```bash
DATABASE_URL
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
OPENAI_API_KEY
```

4. Make sure your PostgreSQL database is reachable from Vercel.
5. Run Prisma migrations against the production database before or during release.
6. Deploy the project from Vercel.

### Prisma on production

After the app is deployed, run the Prisma commands against the production database:

```bash
npx prisma generate
npx prisma migrate deploy
```

### Recommended Vercel checks

- Verify Clerk redirect URLs point to your Vercel domain.
- Confirm the `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` value is set for the production environment.
- Confirm `DATABASE_URL` uses the production database connection string.
- Test a sign-in, a new chat, and one streamed response after deployment.
