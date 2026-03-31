# GrindTogether — Community Fitness Progress Tracker

> A production-grade social fitness platform that turns the gym into a competitive, accountable social ecosystem.

## 🎨 Design — "Dark Neon Gym"

Premium dark-mode interface with electric green energy, glassmorphism depth, and micro-animations.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| State | Zustand + TanStack Query |
| Charts | Recharts |
| Styling | Vanilla CSS + Design Tokens |
| Backend | Express.js |
| Auth | JWT (access + refresh) + bcryptjs |
| Validation | Zod |
| Realtime | Socket.io |
| Database | MongoDB + Mongoose |

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB running locally (or MongoDB Atlas URI)

### Install

```bash
# Install all dependencies
cd server && npm install
cd ../client && npm install
cd ..
npm install
```

### Configure

```bash
# Copy env template
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI if needed
```

### Run

```bash
# Start both client and server
npm run dev

# Or separately:
npm run dev:server   # http://localhost:3000
npm run dev:client   # http://localhost:5173
```

## Project Structure

```
GrindTogether/
├── client/                # React Frontend (Vite)
│   └── src/
│       ├── components/    # UI (GlassCard, StatCard, StreakBadge, ProgressRing)
│       ├── pages/         # Login, Register, Dashboard, Log, Profile, Leaderboard
│       ├── store/         # Zustand stores (auth, ui)
│       ├── services/      # API client with JWT interceptors
│       └── styles/        # Design system (tokens, reset, globals)
│
├── server/                # Express Backend
│   └── src/
│       ├── models/        # User, DailyLog, Challenge, ChatMessage, Notification
│       ├── controllers/   # Auth, Log, Profile, Leaderboard
│       ├── middlewares/   # JWT auth, RBAC, Zod validation, error handler
│       ├── services/      # Streak tracking, points system
│       ├── routes/        # Express route definitions
│       └── app.js         # Entry point
│
└── package.json           # Root — concurrent dev scripts
```

## Features (Phase 1)

- ✅ JWT Authentication (access + refresh tokens, httpOnly cookies)
- ✅ Role-Based Access Control (trainee/trainer)
- ✅ Onboarding flow (profile, gym branch, starting stats)
- ✅ Daily activity logging (checklist, nutrition, cardio, muscle split)
- ✅ Points system (+5 log, +10 full checklist, +100 weekly streak, +500 monthly)
- ✅ Streak tracking with automatic calculation
- ✅ Trainee dashboard with stat cards, charts, and mini leaderboard
- ✅ Full leaderboard (points & streaks tabs, podium display)
- ✅ Profile page with stats and QR code
- ✅ "Dark Neon Gym" design system with glassmorphism and micro-animations
