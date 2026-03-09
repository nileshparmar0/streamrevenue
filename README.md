# 🎮 StreamRevenue - Twitch Creator Monetization Dashboard

A full-stack dashboard that helps Twitch creators track, analyze, and visualize their revenue from Subscriptions, Bits, and more — with **AI-powered revenue predictions**.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Twitch OAuth 2.0** | Secure login with Twitch authentication |
| 💰 **Revenue Dashboard** | Track earnings from Subscriptions & Bits |
| 📊 **Subscriber Analytics** | Breakdown by Tier 1, 2, 3 & Gifted subs |
| 🎉 **Bits Leaderboard** | See top supporters and their contributions |
| 📈 **Revenue Trends** | Historical charts showing earnings over time |
| 🔮 **AI Revenue Predictions** | ML-powered forecasting with confidence intervals |
| ⚡ **Redis Caching** | Sub-100ms API responses with intelligent caching |
| 🔔 **Real-time Alerts** | Live notifications for new subs, bits & follows via EventSub |
| 💾 **Data Persistence** | PostgreSQL database for historical tracking |
| 🐳 **Docker Compose** | One-command infrastructure setup |

---

## 🔮 AI Revenue Predictions

The dashboard uses **machine learning** to forecast future revenue:

- **Linear Regression** for trend analysis
- **Weekly Seasonality Detection** to identify best performing days
- **Confidence Intervals** showing prediction reliability
- **Actionable Insights** generated from historical patterns

```
┌─────────────────────────────────────────────────────┐
│  🔮 AI Revenue Predictions          [30 Days ▼]     │
├─────────────────────────────────────────────────────┤
│  💰 Predicted Revenue    📈 Trend      🎯 Confidence │
│     $127.50 (30 days)    +12.5%        85%          │
├─────────────────────────────────────────────────────┤
│  [═══════ Forecast Chart with Confidence Band ════] │
├─────────────────────────────────────────────────────┤
│  💡 Insights                                        │
│  • 📈 Revenue trending up 12.5% monthly             │
│  • 🌟 Best performing day: Saturday                 │
│  • ✅ Strong prediction confidence with 30+ days    │
└─────────────────────────────────────────────────────┘
```

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
- **Redis** for high-performance caching
- **simple-statistics** for ML predictions

### DevOps
- **Docker Compose** for PostgreSQL & Redis
- **Environment-based configuration**

---

## ⚡ Performance

| Metric | Before | After (with Redis) |
|--------|--------|-------------------|
| API Response Time | ~500ms | **<50ms** (cache hit) |
| Twitch API Calls | Every request | Cached 60-300s |
| Database Queries | Every request | Cached with TTL |

### Cache Strategy

| Endpoint | Cache TTL | Reason |
|----------|-----------|--------|
| `/api/revenue/summary` | 60s | Balance freshness & performance |
| `/api/revenue/subscribers` | 120s | Subscriber data changes less frequently |
| `/api/revenue/predictions` | 600s | ML predictions are computationally expensive |
| `/api/revenue/channel` | 300s | Channel info rarely changes |

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

### 3. Start Infrastructure with Docker Compose
```bash
docker-compose up -d
```

This starts:
- ✅ PostgreSQL on port 5433
- ✅ Redis on port 6379

### 4. Configure Environment Variables
Create `server/.env`:
```env
# Twitch API
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_REDIRECT_URI=http://localhost:3001/auth/callback

# Server
PORT=3001
NODE_ENV=development
SESSION_SECRET=your_random_secret
CLIENT_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=streamrevenue
DB_USER=admin
DB_PASSWORD=admin123

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
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
├── docker-compose.yml           # PostgreSQL + Redis
├── client/                      # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx    # Main dashboard
│   │   │   ├── RevenuePredictions.tsx  # 🆕 AI predictions
│   │   │   ├── RevenueCard.tsx
│   │   │   ├── SubscriberChart.tsx
│   │   │   ├── BitsLeaderboard.tsx
│   │   │   ├── RevenueTrendsChart.tsx
│   │   │   └── LiveAlerts.tsx
│   │   ├── hooks/
│   │   │   └── useTwitchData.ts
│   │   └── styles/
│   │       └── App.css
│   └── package.json
│
├── server/                      # Node.js Backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── revenue.ts       # Includes /predictions endpoint
│   │   │   └── events.ts
│   │   ├── services/
│   │   │   ├── twitchApi.ts
│   │   │   ├── revenueCalculator.ts
│   │   │   ├── database.ts
│   │   │   ├── redis.ts         # 🆕 Cache service
│   │   │   ├── predictions.ts   # 🆕 ML predictions
│   │   │   └── eventSub.ts
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
| Method | Endpoint | Description | Cache |
|--------|----------|-------------|-------|
| GET | `/api/revenue/summary` | Complete revenue overview | 60s |
| GET | `/api/revenue/subscribers` | Subscriber breakdown | 120s |
| GET | `/api/revenue/bits` | Bits leaderboard | 60s |
| GET | `/api/revenue/trends` | Historical trends | 60s |
| GET | `/api/revenue/history` | Revenue history | 60s |
| GET | `/api/revenue/predictions` | 🆕 AI revenue forecast | 600s |
| GET | `/api/revenue/channel` | Channel info | 300s |
| POST | `/api/revenue/cache/clear` | 🆕 Clear user cache | - |

### Events (Real-time)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events/stream` | SSE connection |
| POST | `/api/events/subscribe` | Start EventSub |
| GET | `/api/events/status` | Connection status |

---

## 🔮 Predictions API

### Request
```bash
GET /api/revenue/predictions?days=30
```

### Response
```json
{
  "success": true,
  "data": {
    "predictedRevenue": 127.50,
    "predictedSubscribers": 45,
    "predictedBits": 5000,
    "confidence": 85,
    "trend": "up",
    "trendPercentage": 12.5,
    "forecast": [
      { "date": "2024-03-10", "predicted": 4.25, "lower": 2.10, "upper": 6.40 },
      { "date": "2024-03-11", "predicted": 4.30, "lower": 2.15, "upper": 6.45 }
    ],
    "insights": [
      "📈 Revenue trending up 12.5% monthly",
      "🌟 Best performing day: Saturday",
      "✅ Strong prediction confidence with 30+ days of data"
    ]
  }
}
```

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
- **Caching Strategies** - Redis for performance optimization
- **Machine Learning** - Time-series forecasting with regression
- **Full-stack TypeScript** - Type safety across the stack
- **Third-party API Integration** - Twitch Helix API
- **Data Visualization** - Interactive charts with Recharts
- **DevOps** - Docker Compose for infrastructure

---

## 🚧 Future Enhancements

- [x] ~~Redis caching for API responses~~
- [x] ~~Revenue projections with ML~~
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
