const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
}

async function register(req, res) {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ message: '이메일, 비밀번호, 이름은 필수입니다' });
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) return res.status(409).json({ message: '이미 사용 중인 이메일입니다' });

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (email, password_hash, name, approved) VALUES ($1, $2, $3, false)',
      [email, passwordHash, name]
    );
    // 승인 대기 — 토큰 발급하지 않음
    res.status(201).json({ pending: true, message: '가입 신청이 완료되었습니다. 관리자 승인 후 이용할 수 있습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: '이메일과 비밀번호를 입력하세요' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다' });

    if (!user.approved && user.role !== 'admin') {
      return res.status(403).json({ message: '관리자 승인 대기 중입니다. 승인 후 이용할 수 있습니다.' });
    }

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
