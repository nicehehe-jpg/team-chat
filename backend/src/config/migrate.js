require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const pool = require('./db');

const ADMIN_EMAIL = 'admin@soosan.co.kr';
const ADMIN_PASSWORD = 'admin';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar_url TEXT,
        status TEXT DEFAULT 'offline' CHECK (status IN ('online','offline','away')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL CHECK (type IN ('direct','group')),
        name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS room_members (
        room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        last_read_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (room_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text' CHECK (type IN ('text','image','file')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);

      ALTER TABLE users ADD COLUMN IF NOT EXISTS status_message TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;
    `);

    // 기존 가입자는 전부 승인 처리 (잠기지 않도록)
    await client.query("UPDATE users SET approved = true WHERE approved IS NOT true");

    // 관리자 계정 시드 (없으면 생성, 있으면 admin 권한 부여)
    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await client.query(`
      INSERT INTO users (email, password_hash, name, role, approved)
      VALUES ($1, $2, '관리자', 'admin', true)
      ON CONFLICT (email) DO UPDATE SET role = 'admin', approved = true
    `, [ADMIN_EMAIL, adminHash]);

    console.log('Migration completed: Supabase PostgreSQL (admin seeded)');
  } finally {
    client.release();
  }
}

migrate().catch(console.error);
