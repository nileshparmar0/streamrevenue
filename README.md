# 🎮 StreamRevenue - Twitch Creator Monetization Dashboard

A full-stack dashboard that helps Twitch creators track, analyze, and visualize their revenue from Subscriptions, Bits, and more — in real-time.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Twitch OAuth 2.0** | Secure login with Twitch authentication |
| 💰 **Revenue Dashboard** | Track earnings from Subscriptions & Bits |
| 📊 **Subscriber Analytics** | Breakdown by Tier 1, 2, 3 & Gifted subs |
| 🎉 **Bits Leaderboard** | See top supporters and their contributions |
| 📈 **Revenue Trends** | Historical charts showing earnings over time |
| 🔔 **Real-time Alerts** | Live notifications for new subs, bits & follows via EventSub |
| 💾 **Data Persistence** | PostgreSQL database for historical tracking |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Recharts** for data visualization
- **Server-Sent Events (SSE)** for real-time updates

### Backend
- **Node.js** with Express & TypeScript
- **Twitch Helix API** for creator data
- **Twitch EventSub WebSocket** for real-time events
- **PostgreSQL** for data persistence

### DevOps
- **Docker** for PostgreSQL container
- **Environment-based configuration**

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop
- Twitch Developer Account

### 1. Clone the Repository
```bash
git clone https://github.com/nileshparmar0/streamrevenue.git
cd streamrevenue
```

### 2. Register Twitch Application
1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Click **"Register Your Application"**
3. Set OAuth Redirect URL: `http://localhost:3001/auth/callback`
4. Copy your **Client ID** and **Client Secret**

### 3. Start PostgreSQL with Docker
```bash
docker run --name streamrevenue-db \
  -e POSTGRES_USER=nilesh \
  -e POSTGRES_PASSWORD=nilesh123 \
  -e POSTGRES_DB=streamrevenue \
  -p 5433:5432 -d postgres:15
```

### 4. Configure Environment Variables
Create `server/.env`:
```env
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_REDIRECT_URI=http://localhost:3001/auth/callback
PORT=3001
SESSION_SECRET=your_random_secret
CLIENT_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=streamrevenue
DB_USER=nilesh
DB_PASSWORD=nilesh123
```

### 5. Install Dependencies & Run
```bash
# Backend
cd server
npm install
npm run dev

# Frontend (new terminal)
cd client
npm install --legacy-peer-deps
npm start
```

### 6. Open in Browser
Navigate to `http://localhost:3000` and click **"Login with Twitch"**

---

## 📁 Project Structure

```
streamrevenue/
├── client/                      # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx    # Main dashboard
│   │   │   ├── RevenueCard.tsx  # Revenue display cards
│   │   │   ├── SubscriberChart.tsx
│   │   │   ├── BitsLeaderboard.tsx
│   │   │   ├── RevenueTrendsChart.tsx
│   │   │   └── LiveAlerts.tsx   # Real-time notifications
│   │   ├── hooks/
│   │   │   └── useTwitchData.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   └── styles/
│   │       └── App.css
│   └── package.json
│
├── server/                      # Node.js Backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts          # OAuth endpoints
│   │   │   ├── revenue.ts       # Revenue API
│   │   │   └── events.ts        # EventSub & SSE
│   │   ├── services/
│   │   │   ├── twitchApi.ts     # Twitch Helix API
│   │   │   ├── revenueCalculator.ts
│   │   │   ├── database.ts      # PostgreSQL
│   │   │   └── eventSub.ts      # WebSocket
│   │   └── middleware/
│   │       └── authMiddleware.ts
│   └── package.json
│
└── README.md
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/login` | Redirect to Twitch OAuth |
| GET | `/auth/callback` | OAuth callback handler |
| GET | `/auth/me` | Get current user |
| GET | `/auth/logout` | Logout user |

### Revenue
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/revenue/summary` | Complete revenue overview |
| GET | `/api/revenue/subscribers` | Subscriber breakdown |
| GET | `/api/revenue/bits` | Bits leaderboard |
| GET | `/api/revenue/trends` | Historical trends |
| GET | `/api/revenue/history` | Revenue history |

### Events (Real-time)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events/stream` | SSE connection |
| POST | `/api/events/subscribe` | Start EventSub |
| GET | `/api/events/status` | Connection status |

---

## 💰 Revenue Calculation

```
Subscription Revenue (Creator's ~50% share):
├── Tier 1: $4.99 × 50% = $2.50 per sub
├── Tier 2: $9.99 × 50% = $5.00 per sub
├── Tier 3: $24.99 × 50% = $12.50 per sub
└── Prime: $4.99 × 50% = $2.50 per sub

Bits Revenue:
└── 100 Bits = $1.00 for creator
```

---

## 🔔 Real-time Events (EventSub)

The dashboard receives live notifications for:

| Event | Trigger |
|-------|---------|
| `channel.subscribe` | New subscription |
| `channel.subscription.gift` | Gift subscription |
| `channel.cheer` | Bits cheer |
| `channel.follow` | New follower |

---

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  login VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  profile_image_url TEXT,
  email VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Revenue History Table
```sql
CREATE TABLE revenue_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id),
  date DATE NOT NULL,
  subscriber_count INTEGER,
  tier1_count INTEGER,
  tier2_count INTEGER,
  tier3_count INTEGER,
  sub_revenue DECIMAL(10,2),
  bits_total INTEGER,
  bits_revenue DECIMAL(10,2),
  total_revenue DECIMAL(10,2),
  follower_count INTEGER,
  UNIQUE(user_id, date)
);
```

---

## 🎯 Key Learning Outcomes

Building this project demonstrates:

- **OAuth 2.0 Authentication** - Secure third-party login flow
- **REST API Design** - Clean, organized endpoints
- **Real-time Systems** - WebSocket & Server-Sent Events
- **Database Design** - Relational schema with PostgreSQL
- **Full-stack TypeScript** - Type safety across the stack
- **Third-party API Integration** - Twitch Helix API
- **Data Visualization** - Charts with Recharts

---

## 🚧 Future Enhancements

- [ ] Redis caching for API responses
- [ ] Revenue projections with ML
- [ ] Export reports (CSV/PDF)
- [ ] Multi-channel comparison
- [ ] Goal tracking ("50/100 subs to $500")
- [ ] Mobile responsive design
- [ ] Deployment to cloud (Vercel + Railway)

---

## 👨‍💻 Author

**Nilesh Parmar**

- GitHub: [@nileshparmar0](https://github.com/nileshparmar0)
- LinkedIn: [nilesh-parmar-](https://linkedin.com/in/nilesh-parmar-)
- Email: parmar.nil@northeastern.edu

---

## 📄 License

MIT License - feel free to use this project for learning and portfolio purposes.

---

<p align="center">
  Built with ❤️ for Twitch Creators
</p>
