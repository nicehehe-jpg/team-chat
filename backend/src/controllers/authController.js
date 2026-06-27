const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
}

async function register(req, res) {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ message: '이메일, 비밀번호, 이름은 필수입니다' });

  try {
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(409).json({ message: '이미 사용 중인 이메일입니다' });

    const passwordHash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(id, email, passwordHash, name);
    const user = db.prepare('SELECT id, email, name, avatar_url, status, created_at FROM users WHERE id = ?').get(id);
    res.status(201).json({ user, ...generateTokens(id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: '이메일과 비밀번호를 입력하세요' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다' });

    const { password_hash, ...userOut } = user;
    res.json({ user: userOut, ...generateTokens(user.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'refreshToken이 필요합니다' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    res.json(generateTokens(payload.userId));
  } catch {
    res.status(401).json({ message: '유효하지 않은 refresh token' });
  }
}

module.exports = { register, login, refresh };
