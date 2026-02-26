import { Pool } from 'pg';

// Database connection pool
const pool = new Pool({
  host: 'localhost',
  port: 5433,  // Changed from 5432 to 5433
  database: 'streamrevenue',
  user: 'nilesh',  // Changed from admin
  password: 'nilesh123',  // Changed from admin123
});

console.log('✅ Connecting to database...');

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Initialize tables
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Create users table (store Twitch user info)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        login VARCHAR(100) NOT NULL,
        display_name VARCHAR(100),
        profile_image_url TEXT,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create revenue_history table (store daily revenue snapshots)
    await client.query(`
      CREATE TABLE IF NOT EXISTS revenue_history (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(id),
        date DATE NOT NULL,
        subscriber_count INTEGER DEFAULT 0,
        tier1_count INTEGER DEFAULT 0,
        tier2_count INTEGER DEFAULT 0,
        tier3_count INTEGER DEFAULT 0,
        gifted_count INTEGER DEFAULT 0,
        sub_revenue DECIMAL(10,2) DEFAULT 0,
        bits_total INTEGER DEFAULT 0,
        bits_revenue DECIMAL(10,2) DEFAULT 0,
        total_revenue DECIMAL(10,2) DEFAULT 0,
        follower_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      )
    `);

    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_revenue_history_user_date 
      ON revenue_history(user_id, date DESC)
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Query helper functions
export async function query(text: string, params?: any[]) {
  const result = await pool.query(text, params);
  return result;
}

// Save or update user
export async function saveUser(user: {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  email?: string;
}): Promise<void> {
  await query(
    `INSERT INTO users (id, login, display_name, profile_image_url, email, updated_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE SET
       login = $2,
       display_name = $3,
       profile_image_url = $4,
       email = $5,
       updated_at = CURRENT_TIMESTAMP`,
    [user.id, user.login, user.display_name, user.profile_image_url, user.email]
  );
}

// Save daily revenue snapshot
export async function saveRevenueSnapshot(data: {
  userId: string;
  subscriberCount: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  giftedCount: number;
  subRevenue: number;
  bitsTotal: number;
  bitsRevenue: number;
  totalRevenue: number;
  followerCount: number;
}): Promise<void> {
  await query(
    `INSERT INTO revenue_history (
      user_id, date, subscriber_count, tier1_count, tier2_count, tier3_count,
      gifted_count, sub_revenue, bits_total, bits_revenue, total_revenue, follower_count
    ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (user_id, date) DO UPDATE SET
      subscriber_count = $2,
      tier1_count = $3,
      tier2_count = $4,
      tier3_count = $5,
      gifted_count = $6,
      sub_revenue = $7,
      bits_total = $8,
      bits_revenue = $9,
      total_revenue = $10,
      follower_count = $11`,
    [
      data.userId, data.subscriberCount, data.tier1Count, data.tier2Count,
      data.tier3Count, data.giftedCount, data.subRevenue, data.bitsTotal,
      data.bitsRevenue, data.totalRevenue, data.followerCount
    ]
  );
}

// Get revenue history for a user (last N days)
export async function getRevenueHistory(userId: string, days: number = 30) {
  const result = await query(
    `SELECT * FROM revenue_history 
     WHERE user_id = $1 
     ORDER BY date DESC 
     LIMIT $2`,
    [userId, days]
  );
  return result.rows;
}

// Get revenue trends (daily totals)
export async function getRevenueTrends(userId: string, days: number = 30) {
  const result = await query(
    `SELECT 
      date,
      total_revenue,
      sub_revenue,
      bits_revenue,
      subscriber_count,
      follower_count
     FROM revenue_history 
     WHERE user_id = $1 
       AND date >= CURRENT_DATE - INTERVAL '${days} days'
     ORDER BY date ASC`,
    [userId]
  );
  return result.rows;
}

export default pool;