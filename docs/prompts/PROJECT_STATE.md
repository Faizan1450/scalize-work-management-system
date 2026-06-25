# SWMS — PROJECT_STATE.md

> **Purpose:** Durable source of truth for the SWMS project. If the working chat is lost, a fresh AI session reads this and continues exactly where things left off — full knowledge of decisions, reasoning, current state, working methods. Keep in the repo (backed up via GitHub). **Update at every phase close and major decision**, same ritual as a git tag.
>
> **Last updated:** Post-Phase-4 fixes done & verified, ABOUT TO PUSH/DEPLOY for the first time with all fixes. (Phase 4 tagged `phase-4-complete`; the fixes below sit committed locally on top, not yet pushed.)

---

## 0. How to use this file (instructions for a new AI session)

If you are a fresh AI session picking this up: read this whole file before responding. You act as a **senior full-stack engineer and technical advisor** to Udit, who is building SWMS. Udit executes the actual coding through an AI coding tool (Antigravity, running Gemini); your job is to make architecture decisions, write precise prompts for that tool, and critically review what it produces. The single most important behavior: **never trust the coding tool's "done" without evidence** — it overclaims, marks its own homework, substitutes easy verifications for asked ones, re-pastes old test output as if new, and cuts corners (inventing paths, reusing flags that should be separate, window.confirm instead of styled UI, "typecheck passed" as if that proves runtime, auto-deploying on commit). Demand curl for backend, screenshots/manual confirmation for frontend; Udit's manual pass is the real gate. Be brutally honest, challenge flawed reasoning, push back — Udit wants a no-nonsense coach, not a yes-man. Do NOT rush to the next phase; Udit sets the pace and there are deliberate pauses (see §8).

---

## 1. What SWMS is

**SWMS = SCALive Work Management System.** Internal MERN workforce/task-management app for SCALive (EdTech, Bhopal, India, ~25 people now, capped ~40 within 4 months). Centralized task management + daily planning + workload visibility + accountability for a real team.

**Core loop:** Leads assign tasks to employees (a day + a duration). Employees plan their day by dragging tasks onto a time-blocked timeline. Everyone sees workload/occupancy. Tasks have a two-way comment thread ("Task Chat"). Notifications keep people informed. Owner sits atop the hierarchy and handles open-task triage.

**Scale reality:** ~40 users max near-term. **Do not over-engineer for scale.** Scaling concerns (server-side occupancy, self-registration, real-time chat infra) are explicitly cut — they solve problems this app doesn't have. Optimize for a small, cooperative, internal team.

---

## 2. People & roles

**Real users / hierarchy (rebuilt after a clean DB reset):**
- **Faizan** (Syed Faizan Ali) — `faizan1450` / `Admin@123` — OWNER. Single owner, top of every hierarchy. **Only account that can recover others — guard the password.** (Reset from easy@123 → Admin@123 during testing.)
- **Shruti** (`shruti123`) — Lead, manages Kaif.
- **Kaif** (`kaif`) — Employee under Shruti.
- **Udit** (`udit123`) — Lead, manages Harsh. (Udit also directs this project.)
- **Harsh** — Employee under Udit.
- **Afroz, Shifa** — test employees. (Also used recently: Rishav/lead, Sejal/employee, Ritesh/employee as test names during notification testing.)

**Role rules (LOCKED):** Three roles Owner → Lead → Employee; one account can hold multiple role-views (owner has all three; client-side role switcher). Single owner (Faizan), can't report to anyone / be deactivated. New users created as Employee, promoted to Lead via edit. Employee can report to MULTIPLE leads; leads can report to leads. Owner-only sets hierarchy; owner implicitly above everyone.

---

## 3. Tech stack & environment

- **Monorepo:** `client/` (React 18 + Vite + TypeScript + TailwindCSS) and `server/` (Express + TypeScript + MongoDB Atlas via Mongoose). npm workspaces.
- **No Redux** — Context + hooks. AppContext holds UI-only state (currentRole, selectedDate); real data via API hooks (useTasks, useNotifications).
- **Auth:** JWT (30-day, localStorage), bcrypt.
- **Node:** v24 (LTS; Node 20 EOL'd Apr 2026 — do NOT downgrade). `.nvmrc` = 24.
- **Ports:** server 5001, client 5173.
- **DB:** MongoDB Atlas (cloud). Secrets in `server/.env` (gitignored). Client API base via `VITE_API_URL` (absolute Railway URL), confirmed in `client/src/api/axios.ts`.
- **AI coding tool:** Antigravity IDE running Gemini. Browser subagent is BROKEN (CDP/Playwright error) — **all visual verification falls to Udit.**
- **Code on GitHub.** Commit + tag at phase close.
- **Project path has a space** (`Task Tracker/swms/`).
- **Git author email is a placeholder** (`syedfaizanali@example.com`) — set real email if attribution matters.

---

## 4. DEPLOYMENT (LIVE)

- **Frontend:** Vercel → **https://teamsca.vercel.app** (login at `/login`). Vercel root directory = **`client/`** (confirmed via `.vercel` dir inside client/). SPA routing handled by **`client/vercel.json`** (catch-all rewrite → index.html) — fixes refresh/deep-link 404s.
- **Backend:** Railway → **https://scalize-server-production.up.railway.app**
- **DB:** MongoDB Atlas.
- Deployed via MCP connectors (Vercel + Railway).
- **CRITICAL: `git push` auto-deploys** (Vercel + Railway watch the repo). **commit/push = deploy.** The AI must NOT commit or push without Udit's explicit say-so. (Instruction: "no commits without permission," because commit triggers deploy.)
- **Do NOT put real employee data on live until the Phase 6 security pass.** OK to demo and onboard test/real users for feedback, but treat data as non-sensitive until hardened.

---

## 5. Data model (CURRENT)

**Task:** `title`, `description`, `estimatedDurationMins` (int 10–480, validated client+server+Mongoose), `taskDate` ('YYYY-MM-DD', REQUIRED — the single day; overdue computes off it), `scheduledTime` ('HH:mm', NULLABLE — timeline slot, null = backlog), `status` (not_started/in_progress/completed), `priority` ('high'|'medium'|'low', default medium, null on pre-feature tasks; **display-only**), `assigneeId`/`assignerId` (populated {_id,name,userId,avatarColor} ONLY — NO passwordHash/workSchedule), `raisedBy`, `isOpenTask`, `recurrence` (stored, inert — Phase 5), `movedHistory`, `comments` (immutable Task Chat), `actualStart/End` (captured, NOT displayed — cut), `overdueNotifiedAt`, `imageUrls` (Phase 5). **DELETED, never re-add:** dueDate, plannedDate, plannedStartTime, plannedEndTime. **Overdue = COMPUTED** (taskDate < todayIST AND ≠ completed), never stored. End time = computed (scheduledTime+duration), never stored.

**Notification:** `recipientId`, `type`, `message`, `taskId` (ObjectId|null), `read`, `createdAt`. 10 active types: open_task_raised, task_assigned, task_completed, task_moved, task_updated, task_reassigned, task_deleted (taskId null — task gone), comment_added, open_task_assigned, task_overdue. (Schema also has leave_raised/leave_decision enums — inert, Phase 5.)

**User:** userId, name, passwordHash, roles[], leadIds[], workSchedule ({0..6:hours}, 0=off day), email, phone, designation, joiningDate, avatarColor.

---

## 6. LOCKED decisions & reasoning (do NOT relitigate unless Udit reopens)

- **Single date model** (taskDate + scheduledTime). taskDate = the day (lead-set); scheduledTime = slot (employee-set, null = backlog).
- **Overdue = computed off taskDate.** Carry-over = a VIEW rule: overdue task surfaces in TODAY's backlog keeping its original taskDate. NO auto-move ("Option A").
- **Move = assigner-only** (same auth as Edit). Employees can't move; they request via Task Chat. Allowed not_started + in_progress, BLOCKED completed. On move: taskDate changes, scheduledTime→null, history logged, assignee notified.
- **Reassign/Delete = assigner-only, not_started ONLY. Edit = assigner-only, until completed.**
- **Off-day = soft-warn not hard-block.** Styled in-app confirm (NOT window.confirm). Occupancy on off-day-with-tasks: "Off day · N task(s)", grey bar, NO % (isOffDay flag is the key, avoids divide-by-zero). Confirm fires ONLY when task NEWLY placed on an off-day it isn't already on (per-task by taskDate, NOT a session flag).
- **Open task flow:** raiser sets raisedBy + suggested date; owner claims → assigneeId set, **assignerId becomes OWNER**, isOpenTask=false, raisedBy preserved, owner sets taskDate. No re-delegation.
- **Custom duration:** number input (minutes) + chips [10m][30m][1h][2h][4h] + live "Xh Ym" echo, 10–480, inline-error-blocks-submit, "min" suffix INSIDE the input. **One shared `formatDuration` in client/src/utils/time.ts** — all duration DISPLAY routes through it.
- **Priority = label only.** High = outlined amber badge, Low = muted grey, Medium/null = NO tag. No sort/filter/behavior.
- **Notifications: in-app only**, 60s poll + focus refetch, two-way comment chat. **Comment notifications fan out to assigner + assignee + leads** (parked: owner-spam fanout decision → Phase 5).
- **Notification deep-linking (DONE):** clicking any task-referencing notification opens that task's modal on the correct view — via a `taskId` URL param read by a page-level TaskModal. Lead-facing notifs route to `/lead/member/<assigneeId>?...&taskId=...` (not bare /lead). Deep-link open FETCHES FRESH task data (getTask) so latest comments/status show. Role-mismatch fallback DROPS taskId and opens no modal. open_task_raised → owner queue scrolls+glows the card. task_deleted/reassigned(original assignee) → land safely, no modal.
- **Task modal stay-open:** comment / status-change / edit-save → modal STAYS OPEN and shows fresh data. move / delete / reassign → modal CLOSES (task left the view). Implemented via `onTaskUpdated(updatedTask, shouldClose)` contract.
- **Refresh resilience:** role-view derives from the URL on load (not hardcoded 'employee'), validated against authUser.roles with safe fallback. Refresh on /lead stays on lead; URL-typing a role you lack does NOT grant it.
- **Occupancy (unified):** employee dashboard + TeamMemberDetail each use ONE range-fetched useTasks (allTasks, selectedDate−3..+7); day-view derived via useMemo (carry-over three-bucket rule); main bar AND week-strip chips read from allTasks → can't desync. Carry-over of any age safe (backend range query OR's an unbounded `taskDate < today AND not completed`).
- **CUT entirely:** server-side occupancy, actual-vs-estimated display, collision hardening (sequential by design), self-registration, **real-time chat (WebSockets)** — task comments are async notes; notifications carry the "you've got a reply" signal. Refetch-on-open is enough.

---

## 7. Phase roadmap & status

- **Phase 1** (Static UI) ✅ CLOSED
- **Phase 2** (Backend + Auth) ✅ CLOSED
- **Phase 3** (Task Engine + Real Data Cutover) ✅ CLOSED (`phase-3-complete`)
- **Phase 4** (Planning Experience Hardening) ✅ COMPLETE (`phase-4-complete`, commit `81c0a18`):
  - T1 single-date collapse, T2 assigner-only move, T2.5 off-day soft-warn, T3 custom duration, T4 priority labels, T5 unified occupancy sync. All curl/manual verified.
- **Phase 4.5 — Post-Phase-4 fixes** ✅ DONE & verified, committed locally on top of the tag, **about to push/deploy:**
  - Polish batch: past dates disabled in pickers; create panel defaults to selected day (today if selected day is past); text-selection drag no longer closes modal (mousedown-origin check); "min" suffix inside duration input.
  - Refresh resilience: role-view derived from URL + validated (fixes refresh-bounces-to-employee).
  - Notification deep-linking: all task-referencing types open the task modal on the correct view; lead→member-detail routing; fresh-fetch on open; security fallback drops taskId; open-task card scroll+glow.
  - Task modal stay-open on comment/status/edit; closes on move/delete/reassign.
  - `client/vercel.json` SPA rewrite (fixes live 404 on refresh/deep-link — verifies post-deploy).
- **NEXT ACTION: push all of the above → deploy → verify live → onboard real people → THE PAUSE.**
- **Phase 5** (Advanced) ⬜ — see §8/§9.
- **Phase 6** (Production) ⬜ — security pass (deferred npm audit high-sevs — do NOT `npm audit fix --force`; helmet, rate-limit, refresh tokens); onboard more real people.
- **Phase 7/8** ⬜ — full frontend revamp + optimization after real usage.

---

## 8. THE PAUSE (deliberate)

**After this push/deploy → STOP building net-new. Onboard real people, let them use the live app ~a week, collect feedback BEFORE committing to Phase 5 priorities.** Real usage re-sorts Phase 5 (recurrence vs notifications-polish vs the parked items) better than guessing. The AI has prematurely said "ready for Phase 5" before — don't. EXCEPTION already agreed: **recurrence R&D can proceed in PARALLEL on local only** (build + test on test users, same shared Atlas DB — keep test recurrence OFF real users' accounts; do NOT push until both Udit and advisor approve). Two Phase 5 items NEED design sessions BEFORE any code: **leave management** and **settings/profile**.

---

## 9. Phase 5 scope (post-feedback)

- **Recurrence GENERATION** — currently the field saves but spawns nothing. THE OPEN DESIGN FORK (not yet decided): **Model A** (pre-create a task instance per occurrence — must know end date, lots of records) vs **Model B** (template/rule + generate-on-demand via a nightly job over a rolling window — handles open-ended, clean stop by deactivating template). Advisor lean: **Model B with a bounded rolling horizon** (matches the existing overdue-cron pattern, avoids record explosion, clean stop). R&D questions to resolve: daily-until-when, weekly-which-days, infinite vs bounded, how to stop, edit-one-vs-all (the recurring-event problem). **This discussion is parked at the Model A vs B fork — resume here.**
- **Leave management** — NEEDS DESIGN SESSION (half-day vs occupancy, tasks on leave days, who approves). Schema enums exist but inert.
- **Notification fanout decision** (owner-spam on comments).
- **Image attachments + profile pics** (Cloudinary, bundle).
- **Settings page + profile self-edit** — NEEDS DESIGN SESSION.
- **Reporting layer** (unscoped); "carry-over count per person" metric.
- **Open-task accountability gap (BACKLOG, discuss in P5):** when owner claims an open task and assigns to e.g. Ritesh, owner becomes assigner but doesn't manage Ritesh — Ritesh's actual lead (Rishav) has no power over it. Options: (a) add a "monitoring lead" with assigner-like powers (two power-holders — complicates clean auth), (b) owner assigns AS the lead so that lead becomes assigner (clean single-assigner; advisor lean), (c) route open tasks to leads not owner (fixes root, bigger change). Decide in P5 with real-usage input.

---

## 10. Working method (preserve — this is WHY the project stayed clean)

1. Discuss + lock decisions (with reasoning) before prompting; ask follow-ups until aligned.
2. ONE task at a time.
3. Prompts Gemini-tight: exact paths/fields, explicit delete-not-add, explicit "do NOT do Z" fences, stop-and-confirm.
4. Build → AI self-audit → REVIEW skeptically → fix → Udit MANUAL pass → commit. Manual pass is the real gate.
5. Evidence always: backend = curl (cmd+status+body); frontend = Udit's eyes. "typecheck passed" ≠ runtime proof. Watch for re-pasted old evidence.
6. Commit + tag at phase close (push = deploy here).
7. Update THIS file at phase close + major decisions.

**Known AI/Gemini failure patterns to catch:** overclaims "done"; marks own homework; tests easy case, skips the one testing its actual change; reads code instead of running it; re-pastes prior test output as new; double-fire test bug (use single curl `-w '\n%{http_code}'`); window.confirm vs styled UI; reuses a flag (canEdit) where a separate one (canMove) belongs; invents paths/fields; resets credentials to unblock itself; auto-deploys/pushes without asking; tests only round numbers (90/120 hide bugs 280/95/25 expose); refactors working code unprompted (regression surface — verify those too); over-corrects a fix the other way (e.g. fixed text-select-close but broke backdrop-close — verify BOTH directions of a fix).

---

## 11. Current exact position

- **Phase 4 + all Phase 4.5 fixes DONE & manually verified.** Sitting committed locally on top of `phase-4-complete`, **NOT pushed** → live site still runs older code.
- **IMMEDIATE NEXT: push → first full deploy of the fixed build.** Then live verification:
  1. Deep-route refresh (open /employee directly) → no 404 (vercel.json).
  2. Click a notification → deep-links to the task.
  3. Switch role + refresh → stays on that role.
  4. Status change in a task modal → modal stays open + shows new status.
  5. Full round-trip: login → create → assign → appears.
- **Then: onboard real people → THE PAUSE → collect feedback → resume Phase 5 at the recurrence Model-A-vs-B fork (§9).**
- **Housekeeping owed:** commit PROJECT_STATE.md to repo root; move prompt files to `docs/prompts/`.
- **Owner creds:** `faizan1450` / `Admin@123`.

---

## 12. How to resume in a fresh chat

1. Upload THIS file + relevant prompt files from `docs/prompts/`.
2. Say: "Ongoing SWMS project — read PROJECT_STATE.md and continue as my senior engineer/advisor from the current position."
3. Keep the working method (§10), respect locked decisions (§6), honor THE PAUSE (§8), do NOT relitigate or rush to Phase 5.
4. Honest caveat: a doc transfers decisions + state well; the accumulated *feel* for this project's failure patterns is thinner cold. Re-establish by pointing at §10 and being strict early.
