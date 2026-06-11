# SWMS — SCALive Work Management System

## Overview

SWMS is a multi-role work management platform for field and office teams at SCALive. It supports three roles — **Owner**, **Lead**, and **Employee** — each with distinct views and permissions. The system handles task assignment, daily timeline scheduling, team occupancy visibility, leave management, and notifications.

---

## Monorepo structure

```
swms/
├── client/          # React + Vite frontend (TypeScript)
└── server/          # Express + MongoDB backend (TypeScript)
```

---

## Getting started

### Prerequisites

| Tool | Version |
|------|---------|
| Node | ≥ 18 |
| npm  | ≥ 9   |
| MongoDB Atlas | connection string in `.env` |

### 1. Configure environment

Create `server/.env`:

```env
MONGODB_URI=mongodb+srv://scabhopal98_db_user:<password>@swms-dev.ooibno5.mongodb.net/swms-dev?appName=swms-dev
JWT_SECRET=<strong-random-secret>
PORT=5001
OWNER_USER_ID=udit.sharma
OWNER_NAME=Udit Sharma
```

> ⚠️ Never commit `.env` to git.

### 2. Install dependencies

```bash
cd swms
npm install
```

### 3. Seed the database (first run only)

```bash
npm run seed --workspace=server
```

This creates the owner user (`udit.sharma`) with a temporary password (`SCALive@2025`). **Change it on first login.**

### 4. Start development servers

```bash
npm run dev        # starts both client (port 5173) and server (port 5001) concurrently
```

Or individually:

```bash
npm run dev --workspace=client
npm run dev --workspace=server
```

---

## Architecture

### Phase 2 state (current)

| Layer | Status |
|-------|--------|
| Authentication | ✅ Real (JWT) |
| Owner — Employee Management | ✅ Real API |
| Owner — Hierarchy Config | ✅ Real API |
| Employee View (tasks, timeline) | 🟡 Mock data (Phase 3) |
| Lead View (team, tasks) | 🟡 Mock data (Phase 3) |

### Two-identity model (Phase 2 only)

During Phase 2, two parallel contexts coexist:

- **`AuthContext`** — holds `authUser` (the real logged-in user from the JWT / DB)
- **`AppContext`** — holds `currentUser` (mock user from `client/src/data/users.ts`)

The `currentUser` in AppContext is initialised to the mock user whose `userId` matches the `authUser.userId`. In Phase 3, AppContext will be replaced with real API state and the two contexts will merge.

### Data model — `workSchedule`

Users have a `workSchedule` field instead of separate `workHoursPerDay`, `workStartTime`, `workEndTime`, and `offDays`:

```ts
workSchedule: Record<'0'|'1'|'2'|'3'|'4'|'5'|'6', number>
// Key = JS weekday (0=Sun, 1=Mon … 6=Sat)
// Value = hours available on that day (0 = off day)
```

The timeline view is fixed to **08:00–22:00** for all users regardless of individual hours. Occupancy is calculated as `scheduledMins / (workDayHours * 60)`.

---

## Role reference

| Role | Can do |
|------|--------|
| **Owner** | Manage employees, configure hierarchy, assign open tasks, approve leave, view all |
| **Lead** | Assign tasks to their mapped employees, view team occupancy, comment on tasks |
| **Employee** | Schedule their own tasks, raise open tasks, mark task status, request leave |

A single user can hold multiple roles (e.g., Owner + Lead + Employee). The role switcher in the header controls the active view.

---

## API reference

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Login with userId + password |
| GET | `/api/auth/me` | Bearer | Get current user |
| POST | `/api/auth/change-password` | Bearer | Self-service password change |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | Bearer | List all users |
| POST | `/api/users` | Owner | Create employee |
| PATCH | `/api/users/:id` | Owner | Update employee |
| PATCH | `/api/users/:id/deactivate` | Owner | Soft-deactivate employee |
| GET | `/api/users/:id/leads` | Bearer | Get employee's leads |
| PATCH | `/api/users/:id/leads` | Owner | Update lead mapping |

### Validation rules enforced by the API

- `userId` must be unique
- `roles` array may not contain `owner` (only the seed owner is owner)
- Owner's `leadIds` must remain empty — `PATCH /:id/leads` returns 400 if target is owner
- Circular lead mapping is rejected (A → B → A)
- Owner cannot be deactivated
- `workSchedule` keys `"0"–"6"` are required; values must be 0–24

---

## Development notes

### DEV banner

When operating as **Employee** or **Lead**, a slim amber banner appears at the top of the app indicating the view uses mock data. This disappears automatically in Phase 3 when those views are wired to real APIs.

### Mock user switcher

A **DEV: Switch mock user** panel is accessible from the sidebar bottom. It sets the mock `currentUser` in AppContext for testing different user perspectives without creating real accounts. This does not affect the real `authUser`.

### Environment-safe defaults

The server will not start without `MONGODB_URI` and `JWT_SECRET`. Missing variables produce a clear startup error.

### Port assignment

macOS Monterey and later reserve port **5000** for AirPlay. All SWMS services use:

- **Client (Vite):** `http://localhost:5173`  
- **Server (Express):** `http://localhost:5001`

The Vite config sets `strictPort: true` — if 5173 is occupied at startup, Vite will exit with an error instead of silently hopping to another port (which would break CORS and display error banners everywhere).

---

## Timezone policy

**All times in SWMS are India Standard Time (IST, UTC+5:30).** There is no timezone conversion, no UTC storage normalisation, and no user-configurable timezone. Task dates, work schedules, occupancy windows, and leave dates are all interpreted as IST wall-clock times.

This applies to both the frontend (date inputs, display) and the backend (any date comparisons, scheduling logic). When Phase 3 adds task CRUD APIs, all date/time fields must be stored and queried as IST dates. Do not introduce `Date.UTC`, `toISOString` timezone offsets, or moment-timezone unless explicitly approved.

---

## Occupancy retroactivity policy

Occupancy percentages are **read-only, forward-looking planning aids** — they reflect the current state of scheduled tasks for a given day and are **not retroactively updated** when tasks are completed, moved, or deleted.

Specifically:
- A completed task that was scheduled for 2 hours still contributes 2 hours to that day's occupancy until the day passes and a new occupancy calculation begins.
- Moving a task from Day A to Day B decreases Day A's occupancy and increases Day B's occupancy from the moment the move is saved.
- Deleting or cancelling a task decreases the day's occupancy immediately.

The occupancy thresholds are: **green < 40 %, yellow 40–75 %, red > 75 %**. These constants live in `client/src/utils/occupancy.ts` and must not be duplicated elsewhere — all occupancy-coloring logic must import from that single source.

---


## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client + server in watch mode |
| `npm run build` | Build both workspaces for production |
| `npm run typecheck` | Run TypeScript checks on both workspaces |
| `npm run seed --workspace=server` | Seed the owner user into MongoDB |

---

## Phase roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Static frontend with mock data | ✅ Done |
| 2 | Backend foundation + auth + user management | ✅ Done |
| 3 | Task CRUD API, real Employee & Lead views | 🔜 Next |
| 4 | Notifications, leave management APIs | — |
| 5 | File attachments, recurring task engine | — |

---

## Security notes

- JWTs expire in **7 days** (configurable via `JWT_EXPIRES_IN`)
- Passwords are hashed with **bcrypt** (12 rounds)
- All `/api/users` mutations require Bearer token
- Owner-only routes are guarded by `requireOwner` middleware — non-owners receive 403

---

## Contributing

This is an internal SCALive tool. All changes must pass TypeScript checks before merge:

```bash
npm run typecheck
```
