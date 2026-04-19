# 📋 Next In Line

> A lightweight hiring pipeline that moves itself — built for small engineering teams who can't afford Greenhouse or Lever.

Companies define how many applicants they actively review at once. Everything beyond that waits. When someone exits the pipeline, the next person promotes automatically. No spreadsheets. No manual intervention. No chaos.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Clone the Repository
\```bash
git clone https://github.com/sirichandana0314/next-in-line.git
cd next-in-line
\```

### 2. Create the Database
\```bash
createdb -U postgres next_in_line
\```

### 3. Configure Environment
\```bash
cp server/.env.example server/.env
\```
Edit server/.env and set your PostgreSQL password.

### 4. Set Up Database Schema
\```bash
psql -U postgres -d next_in_line -f server/src/db/schema.sql
\```

### 5. Install Dependencies
\```bash
cd server && npm install
cd ../client && npm install
\```

### 6. Start the Application

Terminal 1 — Backend:
\```bash
cd server
npm run dev
\```

Terminal 2 — Frontend:
\```bash
cd client
npm start
\```

- Backend: http://localhost:3001
- Frontend: http://localhost:3000
- Health check: http://localhost:3001/api/health

---

## 🏗️ Architecture

The system has 3 layers:

**Layer 1 — Frontend (React)**
- Company Dashboard: create jobs, view pipeline, hire or reject applicants
- Applicant Portal: check status, view queue position, acknowledge promotion

**Layer 2 — Backend (Express + Node.js)**
- REST API handles all requests
- PipelineService contains all core business logic
- DecayScheduler runs every 60 seconds checking for expired promotions

**Layer 3 — Database (PostgreSQL)**
- companies table
- job_openings table
- applications table
- application_status_log table (append-only audit trail)

### Tech Stack
- **PostgreSQL** — Relational database with ACID transactions
- **Express** — Node.js web framework
- **React** — Minimal frontend UI
- **Node.js** — Runtime

---

## 🔑 Key Design Decisions

### 1. Why PostgreSQL over MongoDB?

This system has strict transactional requirements:

- When an applicant exits, we must atomically update their status AND promote the next person. If either fails, both must roll back.
- SELECT FOR UPDATE row-level locking prevents race conditions during concurrent applications.
- Relational integrity ensures no orphaned applications ever exist.

MongoDB would require application-level transaction management, adding complexity without benefit.

### 2. Concurrency — Two Applications, One Spot

**The Problem:** Two HTTP requests arrive at the same millisecond for the last available spot.

**The Solution:** PostgreSQL row-level locking with SELECT FOR UPDATE

\```sql
BEGIN;
-- Lock the job row. Any concurrent transaction BLOCKS here.
SELECT active_capacity FROM job_openings WHERE id = $1 FOR UPDATE;
-- Now safely count active applications
SELECT COUNT(*) FROM applications WHERE job_id = $1 AND status = 'active';
-- Make placement decision based on accurate count
-- Insert application
COMMIT;
\```

**How it plays out:**
1. Transaction A locks the job row
2. Transaction B tries to lock — BLOCKED
3. Transaction A counts 9 active, inserts as active now 10, commits
4. Transaction B unblocks, counts 10 active, inserts as waitlisted
5. Capacity is never exceeded — guaranteed

### Concurrency Test — Proven, Not Just Claimed

Run this to prove it works:

\```bash
cd server
node src/tests/concurrencyTest.js
\```

Expected output:
\```
✅ PASSED — Exactly 1 applicant got the active spot
✅ PASSED — Capacity was NEVER exceeded
✅ PASSED — SELECT FOR UPDATE locking works correctly
✅ PASSED — Race condition is fully prevented
\```

5 applications fired simultaneously at a job with capacity 1.
Only 1 gets the spot. Every time. Guaranteed.

### 3. Inactivity Decay System

When a waitlisted applicant is promoted, a countdown begins.

The decay scheduler runs every 60 seconds using setInterval with no external libraries.

**If applicant does not acknowledge in time:**

| Condition | Action |
|-----------|--------|
| decay_count less than max_decays | Push back to waitlist with penalty |
| decay_count equals max_decays | Auto-reject permanently |

**Penalty Formula:**
penalty = ceil(waitlist_size / decay_penalty_divisor) × decay_count
new_position = current_max_position + penalty

**Why this formula?**
- Proportional to how busy the queue is
- Harsher on repeat offenders multiplied by decay_count
- Minimum penalty of 1 position always applied

**Defaults:**
- Decay window: 1440 minutes which is 24 hours and configurable per job
- Penalty divisor: 3 which pushes back by one third of waitlist
- Max decays: 3 which means three strikes then auto-rejected

### 4. Audit Trail

Every status transition creates a row in application_status_log. This table is append-only. Nothing is ever updated or deleted.

This means:
- Full history of any application can be reconstructed
- Every promotion, decay, rejection is traceable
- Debugging is trivial

### 5. No External Queue Libraries

Core logic is custom-built as required. The decay scheduler uses Node.js setInterval with a mutex flag called isRunning to prevent overlapping executions.

---

## 📡 API Documentation

### Base URL: http://localhost:3001/api

### Health Check
\```
GET /api/health
Response: { "status": "healthy", "database": "connected" }
\```

### Companies

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /companies | Create company |
| GET | /companies | List all companies |
| GET | /companies/:id | Get company with jobs |

**Create Company**
\```
POST /companies
Body: { "name": "TechStartup Inc." }
Response 201: { "data": { "id": "uuid", "name": "TechStartup Inc." } }
\```

**List Companies**
\```
GET /companies
Response 200: { "data": [ { "id": "uuid", "name": "..." } ] }
\```

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /jobs | Create job opening |
| GET | /jobs/company/:companyId | List jobs for company |
| GET | /jobs/:id/pipeline | Get full pipeline state |
| PATCH | /jobs/:id/status | Update job status |

**Create Job**
\```
POST /jobs
Body: {
  "companyId": "uuid",
  "title": "Backend Engineer",
  "description": "optional",
  "activeCapacity": 5,
  "decayWindowMinutes": 1440,
  "decayPenaltyDivisor": 3,
  "maxDecays": 3
}
Response 201: { "data": { "id": "uuid", "title": "..." } }
\```

**Get Pipeline State**
\```
GET /jobs/:id/pipeline
Response 200: {
  "data": {
    "job": { "id": "...", "title": "...", "activeCapacity": 5 },
    "pipeline": {
      "active": [...],
      "pendingAcknowledgment": [...],
      "waitlisted": [...],
      "exited": [...]
    },
    "stats": {
      "activeCount": 2,
      "pendingCount": 1,
      "waitlistedCount": 3,
      "spotsAvailable": 0,
      "totalApplications": 10
    }
  }
}
\```

### Applications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /applications | Submit application |
| GET | /applications/lookup?email= | Find by email |
| GET | /applications/:id | Get application status |
| GET | /applications/:id/history | Get full audit trail |
| POST | /applications/:id/exit | Hire or reject or withdraw |
| POST | /applications/:id/acknowledge | Acknowledge promotion |

**Submit Application**
\```
POST /applications
Body: {
  "jobId": "uuid",
  "applicantName": "Jane Doe",
  "applicantEmail": "jane@example.com"
}
Response 201: {
  "data": {
    "id": "uuid",
    "status": "active or waitlisted",
    "waitlist_position": null or 1
  }
}
Errors:
  400 You have already applied to this job
  400 Job opening is not accepting applications
  404 Job opening not found
\```

**Get Application Status**
\```
GET /applications/:id
Response 200: {
  "data": {
    "id": "uuid",
    "jobTitle": "Backend Engineer",
    "companyName": "TechStartup Inc.",
    "status": "waitlisted",
    "queuePosition": 3,
    "totalWaitlisted": 12,
    "decayCount": 0,
    "acknowledgmentDeadline": null or "ISO timestamp",
    "appliedAt": "ISO timestamp"
  }
}
\```

**Get Application History**
\```
GET /applications/:id/history
Response 200: {
  "data": [
    {
      "previous_status": null,
      "new_status": "waitlisted",
      "reason": "Initial application",
      "metadata": {},
      "created_at": "ISO timestamp"
    },
    {
      "previous_status": "waitlisted",
      "new_status": "pending_acknowledgment",
      "reason": "Auto-promoted from waitlist — slot became available",
      "created_at": "ISO timestamp"
    }
  ]
}
\```

**Exit Pipeline**
\```
POST /applications/:id/exit
Body: { "reason": "hired or rejected or withdrawn" }
Response 200: { "data": { "message": "Application rejected successfully" } }
Note: Automatically triggers promotion of next waitlisted applicant
\```

**Acknowledge Promotion**
\```
POST /applications/:id/acknowledge
Response 200: { "data": { "message": "Promotion acknowledged successfully" } }
Error 400: Cannot acknowledge from status active. Must be pending_acknowledgment.
\```

---

## 🔄 Application State Machine

Every application moves through these statuses:

**On Apply:**
- If active spots available → status becomes ACTIVE
- If no spots available → status becomes WAITLISTED

**When active spot opens:**
- Next WAITLISTED person → status becomes PENDING_ACKNOWLEDGMENT
- Acknowledgment timer starts immediately

**If applicant acknowledges in time:**
- PENDING_ACKNOWLEDGMENT → ACTIVE

**If applicant does NOT acknowledge in time:**
- decay_count is less than max_decays → back to WAITLISTED with penalty position
- decay_count equals max_decays → permanently REJECTED
- Next waitlisted person promotes automatically (cascade)

**Company actions on active applicants:**
- ACTIVE → HIRED
- ACTIVE → REJECTED
- ACTIVE → WITHDRAWN

**Valid status values:**
- applied
- active
- waitlisted
- pending_acknowledgment
- hired
- rejected
- withdrawn

---

## 🖥️ Frontend Design Decisions

### Polling over WebSockets

The frontend refreshes every 10 seconds via polling. This is deliberate:

1. **Simplicity** — No WebSocket server or reconnection logic needed
2. **Sufficiency** — Hiring decisions happen over hours not milliseconds
3. **Reliability** — HTTP polling is stateless. Dropped connections just resume
4. **The spec says does not need to be real-time** — optimize for simplicity

The company dashboard has:
- Auto-refresh toggle with 10 second interval
- Manual refresh button for immediate updates

---

## ⚖️ Tradeoffs

| Decision | Benefit | Cost |
|----------|---------|------|
| PostgreSQL FOR UPDATE locking | Bulletproof concurrency | Serializes same-job applications |
| setInterval scheduler | No external dependencies | Single-server only |
| Polling over WebSockets | Simple and reliable | 0 to 10 second stale data window |
| Inline React styles | No CSS framework needed | Harder to maintain at scale |
| Append-only audit log | Full history always available | Storage grows over time |

---

## 🔮 What I Would Change With More Time

1. **Email Notifications** — When promoted, applicants get an email with acknowledgment link
2. **Authentication** — Companies need login credentials, applicants need email verification
3. **WebSocket Layer** — Real-time pipeline updates for company dashboard
4. **Database Migrations** — Use node-pg-migrate instead of raw SQL files
5. **Comprehensive Tests** — Unit tests for PipelineService, integration tests for API
6. **Rate Limiting** — Prevent spam applications
7. **Waitlist Position Compaction** — Renumber positions after decays to remove gaps
8. **Multi-server Scheduling** — PostgreSQL advisory locks for running multiple server instances
9. **Public Job Board** — Applicants can browse openings without needing a Job ID
10. **Pipeline Stages** — Phone screen then Technical then Onsite then Offer stages

---

## 📁 Project Structure

**server/**
- src/controllers/applicationController.js
- src/controllers/companyController.js
- src/controllers/jobController.js
- src/db/pool.js
- src/db/schema.sql
- src/routes/applicationRoutes.js
- src/routes/companyRoutes.js
- src/routes/jobRoutes.js
- src/services/decayScheduler.js
- src/services/pipelineService.js
- src/index.js
- .env.example
- package.json

**client/**
- src/components/ApplicantView.js
- src/components/CompanyDashboard.js
- src/services/api.js
- src/App.js
- src/index.js
- package.json

**root**
- README.md
- LICENSE
- .gitignore

---

## 📄 License

MIT