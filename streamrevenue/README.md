# 🎮 StreamRevenue - Twitch Creator Monetization Dashboard

A full-stack dashboard helping Twitch creators track, analyze, and optimize their revenue from Subscriptions, Bits, and more.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![Node.js](https://img.shields.io/badge/Node.js-20-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)

## 🚀 Features

- **OAuth Login** - Secure "Login with Twitch" authentication
- **Revenue Dashboard** - Track earnings from Subscriptions & Bits
- **Subscriber Analytics** - Tier breakdown (Tier 1/2/3, Prime, Gifted)
- **Bits Leaderboard** - Top supporters and recent cheers
- **Revenue Trends** - Historical charts and projections
- **Real-time Alerts** - Live notifications via EventSub (WebSocket)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Recharts, TailwindCSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Cache | Redis (optional) |
| Auth | Twitch OAuth 2.0 |
| API | Twitch Helix API |
| Real-time | Twitch EventSub (WebSocket) |

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL (optional for MVP)
- Twitch Account

## 🔧 Setup Instructions

### Step 1: Register Twitch Application

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Click **"Register Your Application"**
3. Fill in:
   - **Name**: StreamRevenue (or any unique name)
   - **OAuth Redirect URLs**: `http://localhost:3001/auth/callback`
   - **Category**: Website Integration
4. Click **"Create"**
5. Copy your **Client ID** and generate a **Client Secret**

### Step 2: Environment Setup

```bash
# Clone and enter project
cd streamrevenue

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Step 3: Configure Environment Variables

Create `.env` file in `/server`:

```env
# Twitch API Credentials
TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
TWITCH_REDIRECT_URI=http://localhost:3001/auth/callback

# Server
PORT=3001
NODE_ENV=development

# Session Secret (generate a random string)
SESSION_SECRET=your_random_secret_here

# Frontend URL
CLIENT_URL=http://localhost:3000
```

### Step 4: Run the Application

```bash
# Terminal 1 - Start Backend
cd server
npm run dev

# Terminal 2 - Start Frontend
cd client
npm start
```

### Step 5: Open in Browser

Navigate to `http://localhost:3000` and click "Login with Twitch"

## 📁 Project Structure

```
streamrevenue/
├── client/                     # React Frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── RevenueCard.tsx
│   │   │   ├── SubscriberChart.tsx
│   │   │   ├── BitsLeaderboard.tsx
│   │   │   └── Navbar.tsx
│   │   ├── hooks/              # Custom React hooks
│   │   │   └── useTwitchData.ts
│   │   ├── services/           # API calls
│   │   │   └── api.ts
│   │   ├── styles/             # CSS files
│   │   ├── App.tsx
│   │   └── index.tsx
│   └── package.json
│
├── server/                     # Node.js Backend
│   ├── src/
│   │   ├── routes/             # API routes
│   │   │   ├── auth.ts
│   │   │   └── revenue.ts
│   │   ├── services/           # Business logic
│   │   │   ├── twitchApi.ts
│   │   │   └── revenueCalculator.ts
│   │   ├── middleware/         # Express middleware
│   │   │   └── authMiddleware.ts
│   │   └── index.ts            # Entry point
│   ├── .env
│   └── package.json
│
├── README.md
└── .gitignore
```

## 🔐 Twitch API Scopes Used

| Scope | Purpose |
|-------|---------|
| `user:read:email` | Get user profile |
| `channel:read:subscriptions` | Read subscriber list |
| `bits:read` | Read bits leaderboard |
| `analytics:read:extensions` | Read extension analytics |

## 📊 API Endpoints

### Authentication
- `GET /auth/login` - Redirect to Twitch OAuth
- `GET /auth/callback` - OAuth callback handler
- `GET /auth/logout` - Clear session
- `GET /auth/me` - Get current user

### Revenue Data
- `GET /api/revenue/summary` - Get revenue summary
- `GET /api/revenue/subscribers` - Get subscriber breakdown
- `GET /api/revenue/bits` - Get bits leaderboard
- `GET /api/revenue/history` - Get historical data

## 🎯 Revenue Calculation

```
Subscription Revenue (Creator's 50% share):
- Tier 1: $4.99 × 50% = $2.50 per sub
- Tier 2: $9.99 × 50% = $5.00 per sub  
- Tier 3: $24.99 × 50% = $12.50 per sub
- Prime: $4.99 × 50% = $2.50 per sub

Bits Revenue:
- 100 Bits = $1.00 for creator
```

## 🚧 Roadmap

- [x] Twitch OAuth integration
- [x] Basic revenue dashboard
- [x] Subscriber analytics
- [x] Bits leaderboard
- [ ] Real-time EventSub notifications
- [ ] Revenue projections with ML
- [ ] Export reports (CSV/PDF)
- [ ] Mobile responsive design

## 👨‍💻 Author

**Nilesh Parmar**
- GitHub: [@nileshparmar0](https://github.com/nileshparmar0)
- LinkedIn: [nilesh-parmar-](https://linkedin.com/in/nilesh-parmar-)

## 📄 License

MIT License - feel free to use this project!

---

Built with ❤️ for Twitch Creators
